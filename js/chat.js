/**
 * chat.js — Chat Logic (Production Edition)
 * IndexedDB + P2P + RTDB receipts/typing
 */

import { auth } from './firebase.js';
import {
    upsertUser, getUserByEmail, getUserByUid,
    getChatsForUser, getMessagesForChat, findOrCreateChat,
    buildChatId, deleteMessageById
} from './db.js';
import {
    lookupUserByEmail, lookupUserByUid, sendP2PMessage,
    onMessage, subscribeToPresence, subscribeToReceipts,
    markChatAsRead, setTyping, subscribeToTyping, onNotification
} from './peer.js';

// ─── User ─────────────────────────────────────────────────────────────────────

export async function ensureUserExists(user) {
    await upsertUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=random`
    });
}

// ─── Load Chats ───────────────────────────────────────────────────────────────

export function loadChats(callback) {
    if (!auth.currentUser) return () => {};
    const myUid = auth.currentUser.uid;

    const refresh = async () => {
        const rawChats = await getChatsForUser(myUid);
        const enriched = await Promise.all(rawChats.map(async (chat) => {
            const otherUid = chat.memberUids.find(id => id !== myUid);
            let otherUser = { uid: otherUid, displayName: 'Unknown', email: '', photoURL: '' };

            const local = otherUid ? await getUserByUid(otherUid) : null;
            if (local) {
                otherUser = local;
            } else if (otherUid) {
                const remote = await lookupUserByUid(otherUid);
                if (remote) {
                    otherUser = {
                        uid: remote.uid, email: remote.email,
                        displayName: remote.displayName || remote.email?.split('@')[0] || 'Unknown',
                        photoURL: remote.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(remote.email?.split('@')[0] || 'U')}&background=random`
                    };
                    await upsertUser(otherUser);
                }
            }

            // Count unread messages
            const messages = await getMessagesForChat(chat.id);
            const unreadCount = messages.filter(m =>
                m.senderId !== myUid && m.status !== 'read'
            ).length;

            return {
                id: chat.id,
                memberUids: chat.memberUids,
                lastMessage: chat.lastMessage || '',
                lastTimestamp: chat.lastTimestamp ? {
                    toMillis: () => chat.lastTimestamp,
                    toDate: () => new Date(chat.lastTimestamp)
                } : null,
                otherUser,
                unreadCount
            };
        }));
        callback(enriched);
    };

    refresh();
    const unsubMsg = onMessage(async () => { await refresh(); });
    return () => { unsubMsg(); };
}

// ─── Load Messages ────────────────────────────────────────────────────────────

export function loadMessages(chatId, callback) {
    const refresh = async () => {
        const msgs = await getMessagesForChat(chatId);
        callback(msgs.map(m => ({
            id: m.id, chatId: m.chatId, senderId: m.senderId,
            text: m.text, status: m.status,
            timestamp: m.timestamp ? {
                toDate: () => new Date(m.timestamp),
                toMillis: () => m.timestamp
            } : null
        })));
    };

    refresh();

    // Subscribe to live P2P messages
    const unsubMsg = onMessage(async (incomingChatId) => {
        if (incomingChatId === chatId) await refresh();
    });

    // Subscribe to RTDB receipts so blue ticks update live
    const unsubReceipts = subscribeToReceipts(chatId, async (receipts) => {
        // Update local IndexedDB with receipt statuses
        const { updateMessageStatus } = await import('./db.js');
        for (const [msgId, receipt] of Object.entries(receipts)) {
            await updateMessageStatus(chatId, msgId, receipt.status);
        }
        await refresh();
    });

    return () => { unsubMsg(); unsubReceipts(); };
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(chatId, text) {
    if (!auth.currentUser || !text.trim()) return;
    const myUid = auth.currentUser.uid;
    const uids = chatId.split('__');
    const toUid = uids.find(id => id !== myUid);
    if (!toUid) throw new Error('Invalid chat ID');
    await sendP2PMessage(chatId, toUid, text);
}

// ─── Start Chat ───────────────────────────────────────────────────────────────

export async function startChat(email) {
    const myUser = auth.currentUser;
    if (!myUser) throw new Error('Not authenticated');
    if (email.toLowerCase() === myUser.email.toLowerCase()) {
        throw new Error('You cannot chat with yourself.');
    }

    let otherUser = await getUserByEmail(email);
    if (!otherUser) {
        const remote = await lookupUserByEmail(email);
        if (!remote) throw new Error('User not found. They must sign in to Jchatt first.');
        otherUser = {
            uid: remote.uid, email: remote.email,
            displayName: remote.displayName || remote.email.split('@')[0],
            photoURL: remote.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(remote.email.split('@')[0])}&background=random`
        };
        await upsertUser(otherUser);
    }

    const chat = await findOrCreateChat(myUser.uid, otherUser.uid);
    return chat.id;
}

// ─── Delete Message ───────────────────────────────────────────────────────────

export async function deleteMessage(chatId, messageId) {
    await deleteMessageById(chatId, messageId);
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { subscribeToPresence, markChatAsRead, setTyping, subscribeToTyping, onNotification };
