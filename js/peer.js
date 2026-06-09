/**
 * peer.js — P2P Messaging Layer (Production Edition)
 * 
 * Features:
 * - PeerJS (WebRTC DataChannels) for real-time P2P messaging
 * - RTDB-backed read receipts (blue ticks persist across sessions)
 * - Typing indicators via RTDB
 * - In-browser push notifications
 * - Offline message queue via RTDB /pending
 */

import { auth, rtdb } from './firebase.js';
import {
    ref, set, get, onValue, off, onDisconnect, serverTimestamp,
    push, remove, update,
    query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import {
    saveMessage, updateMessageStatus, upsertUser,
    getUserByEmail, findOrCreateChat, purgeOldMessages,
    getMessagesForChat
} from './db.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _peer = null;
let _myPeerId = null;
let _connections = {};
let _messageHandlers = [];
let _chatUpdateHandlers = [];
let _typingHandlers = [];
let _notificationHandlers = [];
let _callHandlers = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function uidToKey(uid) {
    return uid.replace(/[.#$[\]]/g, '_');
}

// ─── Peer ID Registration ─────────────────────────────────────────────────────

async function registerPeerId(uid, email, displayName, photoURL, peerId) {
    const key = uidToKey(uid);
    await set(ref(rtdb, `users/${key}`), {
        uid, email, peerId,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || '',
        lastSeen: serverTimestamp()
    });
}

export async function lookupUserByEmail(email) {
    try {
        const q = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
        const snap = await get(q);
        if (!snap.exists()) return null;
        let found = null;
        snap.forEach((child) => { found = child.val(); });
        return found;
    } catch (err) {
        console.warn('[RTDB] lookupUserByEmail failed:', err.message);
        return null;
    }
}

export async function lookupUserByUid(uid) {
    const key = uidToKey(uid);
    const snap = await get(ref(rtdb, `users/${key}`));
    return snap.exists() ? snap.val() : null;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

function setupPresence(uid) {
    const key = uidToKey(uid);
    const presenceRef = ref(rtdb, `users/${key}/lastSeen`);
    set(presenceRef, serverTimestamp());
    onDisconnect(presenceRef).set(serverTimestamp());
    setInterval(() => {
        if (auth.currentUser) set(presenceRef, serverTimestamp());
    }, 60000);
}

export function subscribeToPresence(uid, callback) {
    const key = uidToKey(uid);
    const presenceRef = ref(rtdb, `users/${key}/lastSeen`);
    return onValue(presenceRef, (snap) => callback(snap.val()));
}

// ─── Read Receipts via RTDB ───────────────────────────────────────────────────

/**
 * Write a receipt to RTDB so it persists across sessions.
 * Path: /receipts/{chatId}/{messageId} = { status, by, at }
 */
export async function writeReceipt(chatId, messageId, status) {
    try {
        await set(ref(rtdb, `receipts/${chatId}/${messageId}`), {
            status,
            by: auth.currentUser?.uid || '',
            at: serverTimestamp()
        });
    } catch (err) {
        console.warn('[RTDB] writeReceipt failed:', err.message);
    }
}

/**
 * Subscribe to all receipts for a chat.
 * Returns unsubscribe function.
 */
export function subscribeToReceipts(chatId, callback) {
    const receiptsRef = ref(rtdb, `receipts/${chatId}`);
    return onValue(receiptsRef, (snap) => {
        if (!snap.exists()) return;
        const receipts = snap.val(); // { msgId: { status, by, at } }
        callback(receipts);
    });
}

/**
 * Mark all messages in a chat as "read" — writes to RTDB for the sender to see.
 * Only marks messages FROM the other user.
 */
export async function markChatAsRead(chatId, messages) {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;

    const updates = {};
    for (const msg of messages) {
        // Only mark OTHER user's messages as read
        if (msg.senderId !== myUid && msg.status !== 'read') {
            updates[`receipts/${chatId}/${msg.id}`] = {
                status: 'read',
                by: myUid,
                at: Date.now()
            };
        }
    }
    if (Object.keys(updates).length > 0) {
        try {
            await update(ref(rtdb), updates);
        } catch (err) {
            console.warn('[RTDB] markChatAsRead failed:', err.message);
        }
    }
}

// ─── Typing Indicators via RTDB ───────────────────────────────────────────────

let _typingTimeout = null;

/**
 * Signal that we are typing in a chat.
 * Auto-clears after 3 seconds of inactivity.
 */
export function setTyping(chatId, isTyping) {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;

    const key = uidToKey(myUid);
    const typingRef = ref(rtdb, `typing/${chatId}/${key}`);

    if (isTyping) {
        set(typingRef, { uid: myUid, at: Date.now() });
        // Auto-clear after 3s
        if (_typingTimeout) clearTimeout(_typingTimeout);
        _typingTimeout = setTimeout(() => {
            remove(typingRef).catch(() => {});
        }, 3000);
    } else {
        remove(typingRef).catch(() => {});
        if (_typingTimeout) clearTimeout(_typingTimeout);
    }
}

/**
 * Subscribe to typing events in a chat.
 * callback(typingUsers: [{ uid, at }])
 */
export function subscribeToTyping(chatId, callback) {
    const typingRef = ref(rtdb, `typing/${chatId}`);
    return onValue(typingRef, (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const data = snap.val();
        const myUid = auth.currentUser?.uid;
        const now = Date.now();
        const typingUsers = Object.values(data)
            .filter(t => t.uid !== myUid && (now - t.at) < 5000);
        callback(typingUsers);
    });
}

// ─── Pending Message Queue ────────────────────────────────────────────────────

async function enqueuePendingMessage(toUid, msgPayload) {
    const key = uidToKey(toUid);
    await push(ref(rtdb, `pending/${key}`), msgPayload);
}

async function drainPendingMessages(myUid) {
    const key = uidToKey(myUid);
    const pendingRef = ref(rtdb, `pending/${key}`);
    const snap = await get(pendingRef);
    if (!snap.exists()) return;
    const pending = snap.val();
    for (const [, msg] of Object.entries(pending)) {
        await _handleIncomingMessage(msg);
    }
    await remove(pendingRef);
}

// ─── Listen for new pending messages in real-time ─────────────────────────────
let _pendingListener = null;

function listenForPendingMessages(myUid) {
    const key = uidToKey(myUid);
    const pendingRef = ref(rtdb, `pending/${key}`);
    _pendingListener = onValue(pendingRef, async (snap) => {
        if (!snap.exists()) return;
        const pending = snap.val();
        for (const [, msg] of Object.entries(pending)) {
            await _handleIncomingMessage(msg);
        }
        // Clear after processing
        await remove(pendingRef).catch(() => {});
    });
}

// ─── Message Handling ─────────────────────────────────────────────────────────

async function _handleIncomingMessage(msg) {
    // Persist locally
    await saveMessage({
        id: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        text: msg.text,
        status: 'delivered',
        timestamp: msg.timestamp
    });

    // Upsert sender info
    if (msg.senderName) {
        await upsertUser({
            uid: msg.senderId,
            email: msg.senderEmail || '',
            displayName: msg.senderName,
            photoURL: msg.senderPhoto || ''
        });
    }

    // Ensure chat exists locally
    const myUid = auth.currentUser?.uid;
    if (myUid) {
        await findOrCreateChat(myUid, msg.senderId);
    }

    // Write "delivered" receipt to RTDB so sender sees double-grey ticks
    await writeReceipt(msg.chatId, msg.id, 'delivered');

    // Notify UI
    const msgData = {
        id: msg.id, chatId: msg.chatId, senderId: msg.senderId,
        text: msg.text, status: 'delivered', timestamp: msg.timestamp
    };
    _messageHandlers.forEach(fn => fn(msg.chatId, msgData));
    _chatUpdateHandlers.forEach(fn => fn(msg.chatId));

    // Trigger notification
    _notificationHandlers.forEach(fn => fn(msg));
}

function _attachConnectionListeners(conn) {
    conn.on('data', async (data) => {
        if (data.type === 'message') {
            await _handleIncomingMessage(data);
            // Send delivery receipt back via P2P
            try {
                conn.send({ type: 'receipt', msgId: data.id, chatId: data.chatId, status: 'delivered' });
            } catch (_) {}
        }
        if (data.type === 'receipt') {
            await updateMessageStatus(data.chatId, data.msgId, data.status);
            _messageHandlers.forEach(fn => fn(data.chatId, { __receipt: true, id: data.msgId, status: data.status }));
        }
        if (data.type === 'typing') {
            _typingHandlers.forEach(fn => fn(data.chatId, data.isTyping, data.senderId));
        }
    });
    conn.on('close', () => { delete _connections[conn.peer]; });
    conn.on('error', (err) => { console.warn('[PeerJS] Connection error:', err); });
}

// ─── PeerJS Initialization ────────────────────────────────────────────────────

export async function initPeer(user) {
    if (_peer) return _peer;

    return new Promise((resolve) => {
        const peerId = 'jc_' + user.uid.replace(/[^a-zA-Z0-9]/g, '_');
        _myPeerId = peerId;

        const timeout = setTimeout(() => {
            console.warn('[PeerJS] Connection timeout — running in offline mode');
            // Still set up pending listener for RTDB fallback
            listenForPendingMessages(user.uid);
            resolve(null);
        }, 10000);

        const peer = new Peer(peerId, {
            host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        peer.on('open', async (id) => {
            clearTimeout(timeout);
            console.log('[PeerJS] Connected with ID:', id);
            _peer = peer;

            await registerPeerId(
                user.uid, user.email,
                user.displayName || user.email.split('@')[0],
                user.photoURL || '', id
            ).catch(e => console.warn('[PeerJS] RTDB register failed:', e));

            setupPresence(user.uid);
            await drainPendingMessages(user.uid).catch(() => {});
            listenForPendingMessages(user.uid);
            await purgeOldMessages().catch(() => {});
            resolve(peer);
        });

        peer.on('connection', (conn) => {
            conn.on('open', () => {
                _connections[conn.peer] = conn;
                _attachConnectionListeners(conn);
            });
        });

        peer.on('call', (mediaConnection) => {
            _callHandlers.forEach(fn => fn(mediaConnection));
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                clearTimeout(timeout);
                peer.destroy();
                _peer = null;
                resolve(initPeer(user));
            } else {
                console.error('[PeerJS] Error:', err.type, err.message);
                clearTimeout(timeout);
                listenForPendingMessages(user.uid);
                resolve(null);
            }
        });
    });
}

// ─── Connect to Peer ──────────────────────────────────────────────────────────

function _getOrOpenConnection(targetPeerId) {
    if (_connections[targetPeerId]?.open) {
        return Promise.resolve(_connections[targetPeerId]);
    }
    return new Promise((resolve) => {
        const conn = _peer.connect(targetPeerId, { reliable: true });
        conn.on('open', () => { _connections[targetPeerId] = conn; _attachConnectionListeners(conn); resolve(conn); });
        conn.on('error', () => resolve(null));
        setTimeout(() => resolve(null), 8000);
    });
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendP2PMessage(chatId, toUid, text) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const msgId = generateId();
    const timestamp = Date.now();
    const payload = {
        type: 'message', id: msgId, chatId,
        senderId: user.uid, senderEmail: user.email,
        senderName: user.displayName || user.email.split('@')[0],
        senderPhoto: user.photoURL || '',
        text, timestamp
    };

    // 1. Save locally (optimistic — instant)
    await saveMessage({ id: msgId, chatId, senderId: user.uid, text, status: 'sent', timestamp });

    // 2. Try P2P delivery
    let delivered = false;
    if (_peer) {
        try {
            const target = await lookupUserByUid(toUid);
            if (target?.peerId) {
                const conn = await _getOrOpenConnection(target.peerId);
                if (conn?.open) { conn.send(payload); delivered = true; }
            }
        } catch (err) {
            console.warn('[PeerJS] P2P send failed:', err);
        }
    }

    // 3. Always also queue in RTDB for reliability
    // (recipient's drainPendingMessages will deduplicate via message ID)
    await enqueuePendingMessage(toUid, payload).catch(() => {});

    return msgId;
}

// ─── Event Subscriptions ──────────────────────────────────────────────────────

export function onMessage(fn) {
    _messageHandlers.push(fn);
    return () => { _messageHandlers = _messageHandlers.filter(h => h !== fn); };
}

export function onChatUpdate(fn) {
    _chatUpdateHandlers.push(fn);
    return () => { _chatUpdateHandlers = _chatUpdateHandlers.filter(h => h !== fn); };
}

export function onTyping(fn) {
    _typingHandlers.push(fn);
    return () => { _typingHandlers = _typingHandlers.filter(h => h !== fn); };
}

export function onNotification(fn) {
    _notificationHandlers.push(fn);
    return () => { _notificationHandlers = _notificationHandlers.filter(h => h !== fn); };
}

// ─── Call Handling ────────────────────────────────────────────────────────────

export async function makeCall(toUid, stream, metadata = {}) {
    if (!_peer) throw new Error('PeerJS not initialized');
    const target = await lookupUserByUid(toUid);
    if (!target || !target.peerId) {
        throw new Error('User is offline or not found');
    }
    // peer.call returns a MediaConnection
    return _peer.call(target.peerId, stream, { metadata });
}

export function onCall(fn) {
    _callHandlers.push(fn);
    return () => { _callHandlers = _callHandlers.filter(h => h !== fn); };
}

export { _myPeerId as myPeerId };
