/**
 * app.js — Jchatt Main Application (Production Edition)
 *
 * Features:
 * - Blue ticks (read receipts via RTDB, persist across sessions)
 * - Typing indicators ("typing..." under chat header)
 * - Unread message badges on chat list
 * - In-browser push notifications with sound
 * - Emoji picker
 * - Message reply/quote
 * - Notification sound
 */

import { auth } from '../js/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { DEXIE_READY } from '../js/db.js';
import { initPeer, makeCall, onCall } from '../js/peer.js';
import {
    loadChats, loadMessages, sendMessage, startChat, ensureUserExists,
    deleteMessage, subscribeToPresence, markChatAsRead,
    setTyping, subscribeToTyping, onNotification
} from '../js/chat.js';

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const appContainer       = $('appContainer');
const chatListContainer  = $('chatList');
const activeChatContainer= $('activeChat');
const chatBlankState     = $('chatBlankState');
const messagesContainer  = $('messagesContainer');
const messagesWrapper    = $('messagesWrapper');
const messageForm        = $('messageForm');
const messageInput       = $('messageInput');
const currentUserName    = $('currentUserName');
const currentUserAvatar  = $('currentUserAvatar');
const chatHeaderName     = $('chatHeaderName');
const chatHeaderAvatar   = $('chatHeaderAvatar');
const logoutBtn          = $('logoutBtn');
const newChatBtn         = $('newChatBtn');
const newChatModal       = $('newChatModal');
const cancelNewChatBtn   = $('cancelNewChatBtn');
const startNewChatBtn    = $('startNewChatBtn');
const newChatEmail       = $('newChatEmail');
const newChatError       = $('newChatError');
const searchInput        = $('searchInput');
const backBtn            = $('backBtn');
const settingsBtn        = $('settingsBtn');
const settingsModal      = $('settingsModal');
const closeSettingsBtn   = $('closeSettingsBtn');
const themeSelect        = $('themeSelect');
const colorCircles       = document.querySelectorAll('.color-circle');
const attachBtn          = $('attachBtn');
const mediaInput         = $('mediaInput');
const mediaPreviewContainer = $('mediaPreviewContainer');
const mediaPreviewImg    = $('mediaPreviewImg');
const removeMediaBtn     = $('removeMediaBtn');
const emojiBtn           = $('emojiBtn');
const emojiPicker        = $('emojiPicker');
const typingIndicator    = $('typingIndicator');

const audioCallBtn       = $('audioCallBtn');
const videoCallBtn       = $('videoCallBtn');
const videoCallWrapper   = $('videoCallWrapper');
const localVideo         = $('localVideo');
const remoteVideo        = $('remoteVideo');
const callStatusText     = $('callStatusText');
const toggleAudioBtn     = $('toggleAudioBtn');
const toggleVideoBtn     = $('toggleVideoBtn');
const endCallBtn         = $('endCallBtn');

const incomingCallModal  = $('incomingCallModal');
const incomingCallAvatar = $('incomingCallAvatar');
const incomingCallName   = $('incomingCallName');
const acceptCallBtn      = $('acceptCallBtn');
const rejectCallBtn      = $('rejectCallBtn');

// ─── App State ────────────────────────────────────────────────────────────────
let activeChatId       = null;
let activeChatOtherUid = null;
let unsubMessages      = null;
let unsubChats         = null;
let unsubPresence      = null;
let unsubTyping        = null;
let currentChats       = [];
let currentUserData    = null;
let selectedMediaBase64= null;
let replyToMessage     = null;

// Call state
let localStream        = null;
let currentCall        = null;
let isAudioMuted       = false;
let isVideoMuted       = false;

// ─── Notification Sound ───────────────────────────────────────────────────────
const notifSound = new Audio('data:audio/wav;base64,UklGRrgAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZQAAAAFABQAIgAvADoAQwBJAE0ATwBOAEoARAA7ADAAIwAUAAQA9v/n/9r/z//G/7//u/+5/7r/vf/D/8z/1v/j//H/AAAPABwAKAAxADcAOgA6ADcAMQAoAB0AEQADAOb/pv9b/yL//v7u/u/+//4b/0X/ev+2//r/QwCMANEADAEwATQBFgHcAIQAFACR/wA/');

function playNotifSound() {
    try { notifSound.currentTime = 0; notifSound.play().catch(() => {}); } catch (_) {}
}

// ─── Browser Notifications ────────────────────────────────────────────────────
let notificationsEnabled = false;

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        notificationsEnabled = perm === 'granted';
    } else {
        notificationsEnabled = Notification.permission === 'granted';
    }
}

function showBrowserNotification(senderName, text, senderPhoto) {
    if (!notificationsEnabled || document.hasFocus()) return;
    const body = text.startsWith('data:image') ? '📷 Photo' : text.substring(0, 100);
    const notif = new Notification(`${senderName} — Jchatt`, {
        body,
        icon: senderPhoto || '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'jchatt-msg',
        renotify: true
    });
    notif.onclick = () => { window.focus(); notif.close(); };
}

// ─── Theming ──────────────────────────────────────────────────────────────────
const applyTheme = () => {
    const savedTheme = localStorage.getItem('jchattTheme') || 'theme-dark';
    const savedColor = localStorage.getItem('jchattColor') || '#6366f1';
    document.body.className = `${savedTheme} feed-body`;
    document.documentElement.style.setProperty('--accent', savedColor);
    themeSelect.value = savedTheme;
    colorCircles.forEach(c => c.classList.toggle('active', c.dataset.color === savedColor));
};
applyTheme();

settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
closeSettingsBtn.addEventListener('click', () => {
    localStorage.setItem('jchattTheme', themeSelect.value);
    localStorage.setItem('jchattColor', document.querySelector('.color-circle.active')?.dataset.color || '#6366f1');
    applyTheme();
    settingsModal.classList.remove('show');
});
colorCircles.forEach(circle => {
    circle.addEventListener('click', () => {
        colorCircles.forEach(c => c.classList.remove('active'));
        circle.classList.add('active');
        document.documentElement.style.setProperty('--accent', circle.dataset.color);
    });
});
themeSelect.addEventListener('change', (e) => {
    document.body.className = `${e.target.value} feed-body`;
});

// ─── Textarea ─────────────────────────────────────────────────────────────────
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
    if (!this.value) this.style.height = 'auto';
    // Typing indicator
    if (activeChatId) setTyping(activeChatId, this.value.length > 0);
});
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        messageForm.dispatchEvent(new Event('submit'));
    }
});

// ─── Media Attach ─────────────────────────────────────────────────────────────
attachBtn.addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const MAX = 800;
            if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
            else if (height > MAX) { width *= MAX / height; height = MAX; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            selectedMediaBase64 = canvas.toDataURL('image/jpeg', 0.5);
            mediaPreviewImg.src = selectedMediaBase64;
            mediaPreviewContainer.style.display = 'flex';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});
removeMediaBtn.addEventListener('click', () => {
    selectedMediaBase64 = null;
    mediaPreviewContainer.style.display = 'none';
    mediaInput.value = '';
});

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','😢','😭','😡','🥳','👍','👎','❤️','🔥','💯','🎉','✨','💀','🙏','👋','🤝','✌️','🤗','😴','🥺','😏','🤣','😇','🤩','🫡'];

if (emojiBtn && emojiPicker) {
    // Build emoji grid
    emojiPicker.innerHTML = EMOJI_LIST.map(e =>
        `<span class="emoji-item" data-emoji="${e}">${e}</span>`
    ).join('');

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('show');
    });

    emojiPicker.addEventListener('click', (e) => {
        const emoji = e.target.dataset?.emoji;
        if (emoji) {
            messageInput.value += emoji;
            messageInput.focus();
            emojiPicker.classList.remove('show');
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.classList.remove('show');
        }
    });
}

// ─── Reply ────────────────────────────────────────────────────────────────────
const replyPreview = $('replyPreview');
const replyPreviewText = $('replyPreviewText');
const cancelReply = $('cancelReply');

function setReply(msg) {
    replyToMessage = msg;
    if (replyPreview) {
        replyPreviewText.textContent = msg.text.startsWith('data:image') ? '📷 Photo' : msg.text.substring(0, 60);
        replyPreview.style.display = 'flex';
    }
    messageInput.focus();
}

function clearReply() {
    replyToMessage = null;
    if (replyPreview) replyPreview.style.display = 'none';
}

if (cancelReply) cancelReply.addEventListener('click', clearReply);

// ─── Mobile Back ──────────────────────────────────────────────────────────────
backBtn.addEventListener('click', () => {
    appContainer.classList.remove('chat-active');
    activeChatId = null;
    activeChatOtherUid = null;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    if (unsubPresence) { unsubPresence(); unsubPresence = null; }
    if (unsubTyping) { unsubTyping(); unsubTyping = null; }
    clearReply();
    renderChatList(currentChats);
});

// ─── Auth State ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = '/login/'; return; }
    currentUserData = user;

    await DEXIE_READY;
    await ensureUserExists(user);

    currentUserName.textContent = user.displayName || user.email.split('@')[0];
    if (user.photoURL) currentUserAvatar.src = user.photoURL;

    // Request notification permission
    await requestNotificationPermission();

    // Load chats immediately
    if (unsubChats) unsubChats();
    unsubChats = loadChats((chats) => {
        currentChats = chats;
        renderChatList(chats);
        updateTitleBadge(chats);
    });

    // Init P2P in background
    initPeer(user)
        .then(() => console.log('[Jchatt] P2P layer ready'))
        .catch(err => console.warn('[Jchatt] P2P offline:', err));

    // Notification handler
    onNotification((msg) => {
        // Only notify if not currently viewing that chat
        if (msg.chatId !== activeChatId || !document.hasFocus()) {
            playNotifSound();
            showBrowserNotification(
                msg.senderName || 'Someone',
                msg.text,
                msg.senderPhoto
            );
        }
    });

    // Call handlers
    onCall(async (mediaConnection) => {
        const callerName = mediaConnection.metadata?.callerName || 'Someone';
        const callerPhoto = mediaConnection.metadata?.callerPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=random`;
        const isVideo = mediaConnection.metadata?.isVideo;

        incomingCallName.textContent = callerName;
        incomingCallAvatar.src = callerPhoto;
        incomingCallModal.classList.add('show');
        playNotifSound();

        // Handle Accept
        const onAccept = async () => {
            incomingCallModal.classList.remove('show');
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: isVideo ? { facingMode: 'user' } : false,
                    audio: true
                });
                if (isVideo) {
                    localVideo.srcObject = localStream;
                    localVideo.style.display = 'block';
                } else {
                    localVideo.style.display = 'none';
                }

                mediaConnection.answer(localStream);
                currentCall = mediaConnection;
                
                setupCallUI(isVideo);

                mediaConnection.on('stream', (remoteStream) => {
                    remoteVideo.srcObject = remoteStream;
                    callStatusText.textContent = '';
                });

                mediaConnection.on('close', endCurrentCall);
                mediaConnection.on('error', endCurrentCall);

            } catch (err) {
                console.error('Failed to get local stream', err);
                alert('Could not access camera/microphone.');
                mediaConnection.close();
            }
            cleanupListeners();
        };

        // Handle Reject
        const onReject = () => {
            incomingCallModal.classList.remove('show');
            mediaConnection.close();
            cleanupListeners();
        };

        const cleanupListeners = () => {
            acceptCallBtn.removeEventListener('click', onAccept);
            rejectCallBtn.removeEventListener('click', onReject);
        };

        acceptCallBtn.addEventListener('click', onAccept);
        rejectCallBtn.addEventListener('click', onReject);
    });
});

// ─── Call Logic ───────────────────────────────────────────────────────────────

async function startMediaCall(isVideo) {
    if (!activeChatOtherUid) return;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo ? { facingMode: 'user' } : false,
            audio: true
        });

        if (isVideo) {
            localVideo.srcObject = localStream;
            localVideo.style.display = 'block';
        } else {
            localVideo.style.display = 'none';
        }

        setupCallUI(isVideo);
        callStatusText.textContent = 'Calling...';

        const myName = currentUserData?.displayName || currentUserData?.email?.split('@')[0] || 'Unknown';
        const myPhoto = currentUserData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=random`;

        currentCall = await makeCall(activeChatOtherUid, localStream, {
            callerName: myName,
            callerPhoto: myPhoto,
            isVideo: isVideo
        });

        currentCall.on('stream', (remoteStream) => {
            remoteVideo.srcObject = remoteStream;
            callStatusText.textContent = '';
        });

        currentCall.on('close', endCurrentCall);
        currentCall.on('error', endCurrentCall);

    } catch (err) {
        console.error('Call failed', err);
        alert('Call failed. User might be offline or no camera access.');
        endCurrentCall();
    }
}

function setupCallUI(isVideo) {
    videoCallWrapper.style.display = 'block';
    appContainer.style.filter = 'blur(10px)';
    
    isAudioMuted = false;
    isVideoMuted = !isVideo;

    toggleAudioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    toggleAudioBtn.style.color = 'white';
    
    if (isVideo) {
        toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
        toggleVideoBtn.style.color = 'white';
        toggleVideoBtn.style.display = 'block';
    } else {
        toggleVideoBtn.style.display = 'none';
    }
}

function endCurrentCall() {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    videoCallWrapper.style.display = 'none';
    appContainer.style.filter = 'none';
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
}

audioCallBtn?.addEventListener('click', () => startMediaCall(false));
videoCallBtn?.addEventListener('click', () => startMediaCall(true));

toggleAudioBtn?.addEventListener('click', () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        isAudioMuted = !isAudioMuted;
        audioTrack.enabled = !isAudioMuted;
        toggleAudioBtn.innerHTML = isAudioMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
        toggleAudioBtn.style.color = isAudioMuted ? '#ef4444' : 'white';
    }
});

toggleVideoBtn?.addEventListener('click', () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        isVideoMuted = !isVideoMuted;
        videoTrack.enabled = !isVideoMuted;
        toggleVideoBtn.innerHTML = isVideoMuted ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
        toggleVideoBtn.style.color = isVideoMuted ? '#ef4444' : 'white';
    }
});

endCallBtn?.addEventListener('click', endCurrentCall);

// ─── Title Badge (unread count in tab title) ──────────────────────────────────
function updateTitleBadge(chats) {
    const total = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    document.title = total > 0 ? `(${total}) Jchatt` : 'Jchatt';
}

// ─── Logout ───────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
    if (unsubChats) unsubChats();
    if (unsubMessages) unsubMessages();
    if (unsubPresence) unsubPresence();
    if (unsubTyping) unsubTyping();
    await signOut(auth);
});

// ─── Render Chat List ─────────────────────────────────────────────────────────
const renderChatList = (chats) => {
    if (!chats.length) {
        chatListContainer.innerHTML = '<div class="chat-list-empty">No chats yet. Tap <b>+</b> to start a new chat!</div>';
        return;
    }

    chatListContainer.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();

    chats.forEach(chat => {
        const name = chat.otherUser?.displayName || chat.otherUser?.email?.split('@')[0] || 'Unknown';
        if (searchTerm && !name.toLowerCase().includes(searchTerm)) return;

        const chatEl = document.createElement('div');
        chatEl.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;

        let timeString = '';
        if (chat.lastTimestamp) {
            const date = chat.lastTimestamp.toDate();
            const today = new Date();
            timeString = date.toDateString() === today.toDateString()
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        const avatarUrl = chat.otherUser?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

        let lastMsgDisplay = chat.lastMessage || '<i>No messages yet</i>';
        if (lastMsgDisplay.startsWith('data:image')) lastMsgDisplay = '<i class="fas fa-image"></i> Photo';

        // Unread badge
        const badgeHtml = chat.unreadCount > 0
            ? `<span class="unread-badge">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>`
            : '';

        chatEl.innerHTML = `
            <img src="${avatarUrl}" alt="" class="avatar">
            <div class="chat-info">
                <div class="chat-name">
                    <span>${name}</span>
                    <span class="chat-time">${timeString}</span>
                </div>
                <div class="chat-last-msg">
                    ${lastMsgDisplay}
                    ${badgeHtml}
                </div>
            </div>
        `;
        chatEl.addEventListener('click', () => openChat(chat.id, chat.otherUser));
        chatListContainer.appendChild(chatEl);
    });

    // PWA install banner
    if (window.deferredPromptForApp) {
        const banner = document.createElement('div');
        banner.className = 'install-banner';
        banner.innerHTML = `<i class="fas fa-download"></i><div style="flex:1"><strong>Install Jchatt</strong><div style="font-size:11px;opacity:0.8">Get the app on your home screen</div></div><button class="btn btn-primary" style="padding:6px 12px;font-size:12px;width:auto">Install</button>`;
        banner.onclick = async () => { window.deferredPromptForApp.prompt(); const { outcome } = await window.deferredPromptForApp.userChoice; if (outcome === 'accepted') banner.remove(); };
        chatListContainer.prepend(banner);
    }
};
searchInput.addEventListener('input', () => renderChatList(currentChats));

// ─── Open Chat ────────────────────────────────────────────────────────────────
const openChat = (chatId, otherUser) => {
    activeChatId = chatId;
    activeChatOtherUid = otherUser?.uid;

    chatBlankState.style.display = 'none';
    activeChatContainer.style.display = 'flex';
    appContainer.classList.add('chat-active');
    clearReply();

    const name = otherUser?.displayName || otherUser?.email?.split('@')[0] || 'Unknown';
    chatHeaderName.textContent = name;
    chatHeaderAvatar.src = otherUser?.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    // Presence
    if (unsubPresence) unsubPresence();
    const onlineStatusEl = document.querySelector('.online-status');
    onlineStatusEl.textContent = '...';

    if (otherUser?.uid) {
        unsubPresence = subscribeToPresence(otherUser.uid, (lastSeenMs) => {
            if (!lastSeenMs) { onlineStatusEl.textContent = ''; return; }
            const diff = Date.now() - lastSeenMs;
            if (diff < 120000) {
                onlineStatusEl.textContent = 'Online';
                onlineStatusEl.style.color = '#10b981';
            } else {
                const d = new Date(lastSeenMs);
                const today = new Date();
                const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const prefix = d.toDateString() === today.toDateString() ? `today at ${t}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${t}`;
                onlineStatusEl.textContent = `Last seen ${prefix}`;
                onlineStatusEl.style.color = 'var(--text-secondary)';
            }
        });
    }

    // Typing indicator
    if (unsubTyping) unsubTyping();
    if (typingIndicator) typingIndicator.style.display = 'none';
    if (otherUser?.uid) {
        unsubTyping = subscribeToTyping(chatId, (typingUsers) => {
            if (typingIndicator) {
                if (typingUsers.length > 0) {
                    typingIndicator.style.display = 'block';
                    typingIndicator.textContent = 'typing...';
                    // Also show in header
                    onlineStatusEl.textContent = 'typing...';
                    onlineStatusEl.style.color = '#10b981';
                } else {
                    typingIndicator.style.display = 'none';
                }
            }
        });
    }

    renderChatList(currentChats);

    // Load messages
    if (unsubMessages) unsubMessages();
    messagesContainer.innerHTML = '';
    unsubMessages = loadMessages(chatId, (messages) => {
        renderMessages(messages);
        // Mark as read when viewing
        markChatAsRead(chatId, messages);
    });

    if (window.innerWidth <= 768) document.activeElement.blur();
};

// ─── Render Messages ──────────────────────────────────────────────────────────
const renderMessages = (messages) => {
    messagesContainer.innerHTML = '';
    let lastDate = null;

    messages.forEach(msg => {
        if (!msg.timestamp) return;
        const date = msg.timestamp.toDate();
        const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

        if (dateString !== lastDate) {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = dateString;
            messagesContainer.appendChild(dateHeader);
            lastDate = dateString;
        }

        const msgEl = document.createElement('div');
        const isMe = msg.senderId === currentUserData?.uid;
        msgEl.className = `message ${isMe ? 'msg-out' : 'msg-in'}`;

        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // ─── Blue Tick Logic ──────────────────────────────────────────
        let statusHtml = '';
        if (isMe) {
            if (msg.status === 'read') {
                // Double blue ticks ✓✓
                statusHtml = '<i class="fas fa-check-double read-status blue-tick"></i>';
            } else if (msg.status === 'delivered') {
                // Double grey ticks ✓✓
                statusHtml = '<i class="fas fa-check-double read-status delivered-tick"></i>';
            } else {
                // Single grey tick ✓
                statusHtml = '<i class="fas fa-check read-status sent-tick"></i>';
            }
        }

        // Reply context
        let replyHtml = '';
        if (msg.replyTo) {
            replyHtml = `<div class="reply-context"><i class="fas fa-reply"></i> ${msg.replyTo}</div>`;
        }

        let contentHtml = msg.text || '';
        if (contentHtml.startsWith('data:image')) {
            contentHtml = `<img src="${msg.text}" class="msg-media" alt="Photo">`;
        } else {
            // Auto-link URLs
            contentHtml = contentHtml.replace(
                /(https?:\/\/[^\s]+)/g,
                '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent)">$1</a>'
            );
        }

        msgEl.innerHTML = `
            ${replyHtml}
            ${contentHtml}
            <div class="msg-meta">
                <span>${timeString}</span>
                ${statusHtml}
            </div>
        `;

        // Long press / right click context menu
        if (isMe) {
            msgEl.addEventListener('contextmenu', (e) => { e.preventDefault(); showMsgMenu(e, msg, true); });
            msgEl.addEventListener('touchstart', () => { msgEl._longPress = setTimeout(() => showMsgMenu(null, msg, true), 600); });
            msgEl.addEventListener('touchend', () => clearTimeout(msgEl._longPress));
        } else {
            msgEl.addEventListener('contextmenu', (e) => { e.preventDefault(); showMsgMenu(e, msg, false); });
            msgEl.addEventListener('touchstart', () => { msgEl._longPress = setTimeout(() => showMsgMenu(null, msg, false), 600); });
            msgEl.addEventListener('touchend', () => clearTimeout(msgEl._longPress));
        }

        messagesContainer.appendChild(msgEl);
    });

    messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
};

// ─── Message Context Menu ─────────────────────────────────────────────────────
function showMsgMenu(event, msg, isMe) {
    // Remove existing menu
    document.querySelectorAll('.msg-context-menu').forEach(el => el.remove());

    const menu = document.createElement('div');
    menu.className = 'msg-context-menu';
    menu.innerHTML = `
        <div class="msg-menu-item" data-action="reply"><i class="fas fa-reply"></i> Reply</div>
        <div class="msg-menu-item" data-action="copy"><i class="fas fa-copy"></i> Copy</div>
        ${isMe ? '<div class="msg-menu-item danger" data-action="delete"><i class="fas fa-trash"></i> Delete</div>' : ''}
    `;

    menu.addEventListener('click', async (e) => {
        const action = e.target.closest('.msg-menu-item')?.dataset.action;
        if (action === 'reply') setReply(msg);
        if (action === 'copy') {
            const text = msg.text?.startsWith('data:image') ? '[Photo]' : msg.text;
            navigator.clipboard.writeText(text).catch(() => {});
        }
        if (action === 'delete') {
            if (confirm('Delete this message?')) {
                await deleteMessage(activeChatId, msg.id);
                if (unsubMessages) unsubMessages();
                unsubMessages = loadMessages(activeChatId, renderMessages);
            }
        }
        menu.remove();
    });

    document.body.appendChild(menu);

    // Position
    if (event) {
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
    } else {
        menu.style.left = '50%';
        menu.style.top = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
    }

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 10);
}

// ─── Send Message ─────────────────────────────────────────────────────────────
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let text = selectedMediaBase64 || messageInput.value.trim();
    if (!text || !activeChatId) return;

    // Prepend reply context if replying
    if (replyToMessage && !selectedMediaBase64) {
        const replySnippet = replyToMessage.text.startsWith('data:image') ? '📷' : replyToMessage.text.substring(0, 30);
        // Store reply as part of message for now (simple approach)
        text = text; // keep text as-is, reply UI is handled separately
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';
    selectedMediaBase64 = null;
    mediaPreviewContainer.style.display = 'none';
    mediaInput.value = '';
    clearReply();

    // Stop typing indicator
    setTyping(activeChatId, false);

    try {
        await sendMessage(activeChatId, text);
        messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    } catch (err) {
        console.error('Send error:', err);
        alert('Failed to send: ' + err.message);
    }
});

// ─── New Chat Modal ───────────────────────────────────────────────────────────
newChatBtn.addEventListener('click', () => {
    newChatModal.classList.add('show');
    newChatEmail.value = '';
    newChatError.textContent = '';
    setTimeout(() => newChatEmail.focus(), 100);
});
cancelNewChatBtn.addEventListener('click', () => newChatModal.classList.remove('show'));

startNewChatBtn.addEventListener('click', async () => {
    const email = newChatEmail.value.trim();
    if (!email) return;
    startNewChatBtn.disabled = true;
    startNewChatBtn.textContent = 'Starting...';
    newChatError.textContent = '';
    newChatError.style.display = 'none';

    try {
        const chatId = await startChat(email);
        newChatModal.classList.remove('show');
        setTimeout(() => {
            const chat = currentChats.find(c => c.id === chatId);
            if (chat) { openChat(chat.id, chat.otherUser); }
            else {
                loadChats((chats) => {
                    currentChats = chats; renderChatList(chats);
                    const f = chats.find(c => c.id === chatId);
                    if (f) openChat(f.id, f.otherUser);
                });
            }
        }, 400);
    } catch (error) {
        let msg = error.message;
        if (msg.includes('User not found')) msg = 'No user found with this email. They must sign in to Jchatt first.';
        newChatError.textContent = msg;
        newChatError.style.display = 'block';
    } finally {
        startNewChatBtn.disabled = false;
        startNewChatBtn.textContent = 'Start Chat';
    }
});
