/**
 * db.js — IndexedDB Layer (via Dexie.js CDN)
 * Replaces Firebase Firestore for local persistent storage.
 * All chat history & user data is stored client-side.
 *
 * NOTE: Dexie is loaded as a global via CDN <script> tag before any ES module loads.
 */

// Re-export a ready promise so callers can await DB initialization.
// Has a 5-second hard timeout so the app never hangs if CDN is delayed.
export const DEXIE_READY = new Promise((resolve) => {
    // Already loaded
    if (typeof Dexie !== 'undefined') {
        resolve();
        return;
    }
    // Poll every 50ms
    const interval = setInterval(() => {
        if (typeof Dexie !== 'undefined') {
            clearInterval(interval);
            clearTimeout(hardTimeout);
            resolve();
        }
    }, 50);
    // Hard timeout: give up waiting after 5s and attempt anyway
    const hardTimeout = setTimeout(() => {
        clearInterval(interval);
        console.warn('[Dexie] CDN load timeout — attempting to continue...');
        resolve(); // Resolve anyway — IndexedDB ops will fail gracefully if Dexie missing
    }, 5000);
});

let _db = null;

export function getDB() {
    if (_db) return _db;
    const db = new Dexie('JchattDB');
    db.version(1).stores({
        users:    'uid, email, displayName',
        chats:    'id, *memberUids, lastTimestamp',
        // id field indexed for fast duplicate checks; chatId for per-chat queries
        messages: '++localId, id, chatId, timestamp, senderId'
    });
    _db = db;
    return db;
}

// ─── USER helpers ────────────────────────────────────────────────────────────

export async function upsertUser(userObj) {
    // userObj: { uid, email, displayName, photoURL }
    const db = getDB();
    await db.users.put(userObj);
}

export async function getUserByEmail(email) {
    const db = getDB();
    return db.users.where('email').equals(email).first();
}

export async function getUserByUid(uid) {
    const db = getDB();
    return db.users.get(uid);
}

// ─── CHAT helpers ─────────────────────────────────────────────────────────────

export async function upsertChat(chatObj) {
    // chatObj: { id, memberUids: [], lastMessage, lastTimestamp }
    const db = getDB();
    await db.chats.put(chatObj);
}

export async function getChatsForUser(uid) {
    const db = getDB();
    // memberUids is a multi-entry index
    const chats = await db.chats.where('memberUids').equals(uid).toArray();
    // Sort by lastTimestamp desc
    return chats.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
}

export async function getChatById(chatId) {
    const db = getDB();
    return db.chats.get(chatId);
}

/** Derive a deterministic chat ID from two UIDs */
export function buildChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('__');
}

export async function findOrCreateChat(myUid, otherUid) {
    const db = getDB();
    const chatId = buildChatId(myUid, otherUid);
    const existing = await db.chats.get(chatId);
    if (existing) return existing;
    const chat = {
        id: chatId,
        memberUids: [myUid, otherUid],
        lastMessage: '',
        lastTimestamp: Date.now()
    };
    await db.chats.put(chat);
    return chat;
}

// ─── MESSAGE helpers ──────────────────────────────────────────────────────────

export async function saveMessage(msgObj) {
    /**
     * msgObj: {
     *   id: string  — stable UUID from sender,
     *   chatId: string,
     *   senderId: string,
     *   text: string,
     *   status: 'sent' | 'delivered' | 'read',
     *   timestamp: number (ms)
     * }
     * Idempotent — safe to call multiple times with same id.
     */
    const db = getDB();

    // Fast duplicate check via the 'id' index
    const existingMsg = await db.messages.where('id').equals(msgObj.id).first();

    if (existingMsg) {
        // Update status only (e.g. sent → delivered → read)
        await db.messages.update(existingMsg.localId, { status: msgObj.status });
        return existingMsg.localId;
    }

    const localId = await db.messages.add(msgObj);

    // Keep chat preview current
    const preview = msgObj.text.startsWith('data:image') ? 'Photo' : msgObj.text;
    await db.chats.update(msgObj.chatId, {
        lastMessage: preview,
        lastTimestamp: msgObj.timestamp
    });

    return localId;
}

export async function getMessagesForChat(chatId) {
    const db = getDB();
    const msgs = await db.messages.where('chatId').equals(chatId).toArray();
    return msgs.sort((a, b) => a.timestamp - b.timestamp);
}

export async function updateMessageStatus(chatId, msgId, status) {
    const db = getDB();
    const msg = await db.messages
        .where('chatId').equals(chatId)
        .filter(m => m.id === msgId)
        .first();
    if (msg) await db.messages.update(msg.localId, { status });
}

export async function deleteMessageById(chatId, msgId) {
    const db = getDB();
    const msg = await db.messages
        .where('chatId').equals(chatId)
        .filter(m => m.id === msgId)
        .first();
    if (msg) await db.messages.delete(msg.localId);
}

/** Purge messages older than 30 days (storage hygiene) */
export async function purgeOldMessages() {
    const db = getDB();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await db.messages.where('timestamp').below(cutoff).delete();
}
