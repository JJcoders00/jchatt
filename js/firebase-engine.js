/* ===== JCHATT v2 REAL-TIME FIREBASE ENGINE & WEBRTC CALLS ===== */
(function (global) {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDkISiLKl_1XuY66Y52rLoryKL8m9J7BK8',
    authDomain: 'jjcodersjchatt.firebaseapp.com',
    databaseURL: 'https://jjcodersjchatt-default-rtdb.firebaseio.com',
    projectId: 'jjcodersjchatt',
    storageBucket: 'jjcodersjchatt.firebasestorage.app',
    messagingSenderId: '306552756545',
    appId: '1:306552756545:web:f7cf551b8560b77b5ca9c0',
    measurementId: 'G-HDLNBL64PV'
  };

  var ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  function uidShort() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function mapAuthError(err) {
    var code = (err && err.code) || '';
    var msg = (err && err.message) || 'Connection error';
    if (code === 'auth/email-already-in-use') {
      return { error: 'taken', code: 'taken', message: 'That private ID is already taken. Try another or restore it with your 12-word phrase.' };
    }
    if (code === 'auth/invalid-email' || code === 'auth/missing-email') {
      return { error: 'invalid_handle', code: 'invalid_handle', message: 'Use 3-28 letters, numbers, dots, underscores, or hyphens.' };
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/user-not-found') {
      return { error: 'bad_credentials', code: 'bad_credentials', message: 'Private ID or 12-word recovery phrase did not match.' };
    }
    if (code === 'auth/network-request-failed') {
      return { error: 'network', code: 'network', message: 'Network unreachable. Check your connection and retry.' };
    }
    if (code === 'auth/too-many-requests') {
      return { error: 'rate_limit', code: 'rate_limit', message: 'Too many attempts. Wait a few seconds and try again.' };
    }
    return { error: code || 'unknown', code: code || 'unknown', message: msg };
  }

  var Engine = {
    app: null,
    auth: null,
    db: null,
    uid: null,
    me: null,
    connected: false,
    ready: false,
    listeners: new Set(),

    // Live reactive mirrors synced from /v2/
    chats: {},          // chatId -> chat summary from /v2/userChats/{uid}/{chatId}
    messagesByChat: {}, // chatId -> { msgId -> msgObj }
    pendingByChat: {},  // chatId -> { msgId -> optimistic msgObj }
    typingByChat: {},   // chatId -> { uid -> { name, ts } }
    peerPresence: {},   // uid -> { online, lastSeen, name, handle, avatar, bio }
    statuses: {},       // statusId -> statusObj
    callLogs: {},       // logId -> callLogObj
    blocked: {},        // uid -> true
    incomingCall: null, // active incoming call payload
    activeCall: null,   // active call state

    _activeChatId: null,
    _activeChatRef: null,
    _activeTypingRef: null,
    _activePeerRef: null,
    _activePeerUid: null,
    _userChatsRef: null,
    _statusesRef: null,
    _callLogsRef: null,
    _incomingCallsRef: null,
    _blockedRef: null,
    _connRef: null,
    _callSignalRef: null,
    _pc: null,
    _localStream: null,
    _remoteStream: null,
    _vanishTimer: null,
    _authUnsub: null,

    init: function () {
      if (Engine.ready) return true;
      if (!global.firebase) throw new Error('Firebase SDK failed to load');
      Engine.app = firebase.apps && firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(FIREBASE_CONFIG);
      Engine.auth = firebase.auth();
      Engine.db = firebase.database();
      Engine.ready = true;

      Engine._connRef = Engine.db.ref('.info/connected');
      Engine._connRef.on('value', function (snap) {
        Engine.connected = !!snap.val();
        if (Engine.connected && Engine.uid) {
          var presRef = Engine.db.ref('v2/users/' + Engine.uid);
          presRef.onDisconnect().update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
          }).catch(function () {});
          presRef.update({
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
          }).catch(function () {});
        }
        Engine._emit('connection');
      });

      if (!Engine._vanishTimer) {
        Engine._vanishTimer = setInterval(Engine._sweepExpiredMessages.bind(Engine), 1000);
      }
      return true;
    },

    onChange: function (fn) {
      Engine.listeners.add(fn);
      return function () { Engine.listeners.delete(fn); };
    },

    _emit: function (reason) {
      Engine.listeners.forEach(function (fn) {
        try { fn(reason); } catch (e) { console.error('[Engine listener]', e); }
      });
    },

    watchAuth: function (cb) {
      Engine.init();
      if (Engine._authUnsub) Engine._authUnsub();
      Engine._authUnsub = Engine.auth.onAuthStateChanged(function (user) {
        if (user) {
          Engine.uid = user.uid;
          Engine._attachGlobalListeners(user.uid);
        } else {
          Engine._detachAllListeners();
          Engine.uid = null;
          Engine.me = null;
        }
        if (cb) cb(user);
      });
    },

    // --- 1. Authentication & Private ID Management ---
    createAccount: async function (opts) {
      Engine.init();
      var handle = global.JCA.normalizeHandle(opts.handle);
      if (!handle || handle.length < 4) {
        return { error: 'invalid_handle', message: 'Private ID must be at least 3 characters (e.g. @alex.r).' };
      }
      var phrase = Array.isArray(opts.phrase) ? opts.phrase : global.JCA.generatePhrase();
      var cred = global.JCA.deriveCredentials(handle, phrase);
      var avatar = opts.avatar || global.JCA.pickAvatar(handle);
      var displayName = (opts.name || handle.replace(/^@/, '')).trim();
      var bio = (opts.bio || 'Available on JChatt').trim();

      try {
        var res = await Engine.auth.createUserWithEmailAndPassword(cred.email, cred.password);
        var uid = res.user.uid;
        Engine.uid = uid;
        var profile = {
          uid: uid,
          handle: cred.handle,
          handleHash: cred.handleHash,
          name: displayName,
          bio: bio,
          avatar: avatar,
          masks: opts.masks || [
            { id: 'main', name: displayName, handle: cred.handle, bio: bio, active: true }
          ],
          online: true,
          lastSeen: firebase.database.ServerValue.TIMESTAMP,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await Engine.db.ref().update((function () {
          var up = {};
          up['v2/users/' + uid] = profile;
          up['v2/handles/' + cred.handleHash] = {
            uid: uid,
            handle: cred.handle,
            name: displayName,
            bio: bio,
            avatar: avatar,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          };
          return up;
        })());
        Engine.me = Object.assign({}, profile, { createdAt: Date.now(), lastSeen: Date.now() });
        Engine._attachGlobalListeners(uid);
        return { ok: true, uid: uid, profile: Engine.me, phrase: phrase };
      } catch (err) {
        return mapAuthError(err);
      }
    },

    restoreAccount: async function (handleRaw, phraseText) {
      Engine.init();
      var handle = global.JCA.normalizeHandle(handleRaw);
      if (!handle) {
        return { error: 'invalid_handle', message: 'Enter your private ID (for example @alex.r).' };
      }
      var words = String(phraseText || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length < 6) {
        return { error: 'bad_phrase', message: 'Enter your 12-word recovery phrase.' };
      }
      var cred = global.JCA.deriveCredentials(handle, words);
      try {
        var res = await Engine.auth.signInWithEmailAndPassword(cred.email, cred.password);
        var uid = res.user.uid;
        Engine.uid = uid;
        var profile = await Engine.ensureProfile(uid, cred);
        Engine._attachGlobalListeners(uid);
        return { ok: true, uid: uid, profile: profile, phrase: words };
      } catch (err) {
        return mapAuthError(err);
      }
    },

    ensureProfile: async function (uid, fallbackCred) {
      Engine.init();
      var snap = await Engine.db.ref('v2/users/' + uid).once('value');
      var prof = snap.val();
      if (!prof && fallbackCred) {
        var dName = fallbackCred.handle.replace(/^@/, '');
        prof = {
          uid: uid,
          handle: fallbackCred.handle,
          handleHash: fallbackCred.handleHash,
          name: dName,
          bio: 'Available on JChatt',
          avatar: global.JCA.pickAvatar(fallbackCred.handle),
          masks: [{ id: 'main', name: dName, handle: fallbackCred.handle, bio: 'Available on JChatt', active: true }],
          online: true,
          lastSeen: firebase.database.ServerValue.TIMESTAMP,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await Engine.db.ref('v2/users/' + uid).set(prof);
      }
      if (prof && prof.handleHash) {
        // Verify handle directory entry exists so peers can always find this user
        Engine.db.ref('v2/handles/' + prof.handleHash).once('value').then(function (hSnap) {
          if (!hSnap.exists()) {
            Engine.db.ref('v2/handles/' + prof.handleHash).set({
              uid: uid,
              handle: prof.handle,
              name: prof.name || prof.handle,
              bio: prof.bio || '',
              avatar: prof.avatar || global.JCA.pickAvatar(prof.handle),
              createdAt: firebase.database.ServerValue.TIMESTAMP
            });
          }
        }).catch(function () {});
      }
      Engine.me = prof;
      return prof;
    },

    updateProfile: async function (patch) {
      if (!Engine.uid || !Engine.me) return;
      var next = Object.assign({}, Engine.me, patch);
      Engine.me = next;
      var up = {};
      if (patch.name !== undefined) up['v2/users/' + Engine.uid + '/name'] = patch.name;
      if (patch.bio !== undefined) up['v2/users/' + Engine.uid + '/bio'] = patch.bio;
      if (patch.avatar !== undefined) up['v2/users/' + Engine.uid + '/avatar'] = patch.avatar;
      if (patch.masks !== undefined) up['v2/users/' + Engine.uid + '/masks'] = patch.masks;
      if (Engine.me.handleHash) {
        if (patch.name !== undefined) up['v2/handles/' + Engine.me.handleHash + '/name'] = patch.name;
        if (patch.bio !== undefined) up['v2/handles/' + Engine.me.handleHash + '/bio'] = patch.bio;
        if (patch.avatar !== undefined) up['v2/handles/' + Engine.me.handleHash + '/avatar'] = patch.avatar;
      }
      await Engine.db.ref().update(up);
      Engine._emit('profile');
    },

    logout: async function () {
      try {
        if (Engine.uid) {
          await Engine.db.ref('v2/users/' + Engine.uid).update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
          }).catch(function () {});
        }
      } finally {
        Engine._detachAllListeners();
        await Engine.auth.signOut();
        Engine.uid = null;
        Engine.me = null;
        Engine._resetMirrors();
        Engine._emit('logout');
      }
    },

    burnAccount: async function () {
      if (!Engine.uid || !Engine.auth.currentUser) return;
      var uid = Engine.uid;
      var hHash = Engine.me && Engine.me.handleHash;
      var up = {};
      up['v2/users/' + uid] = null;
      up['v2/userChats/' + uid] = null;
      up['v2/callLogs/' + uid] = null;
      up['v2/calls/' + uid] = null;
      up['v2/blocked/' + uid] = null;
      if (hHash) up['v2/handles/' + hHash] = null;
      await Engine.db.ref().update(up).catch(function () {});
      try {
        await Engine.auth.currentUser.delete();
      } catch (e) {
        await Engine.auth.signOut().catch(function () {});
      }
      Engine._detachAllListeners();
      Engine.uid = null;
      Engine.me = null;
      Engine._resetMirrors();
      Engine._emit('burn');
    },

    // --- 2. Device Pairing (/v2/pairings) & One-Time Invites (/v2/invites) ---
    createPairingCode: async function (phraseWords) {
      if (!Engine.uid || !Engine.me) throw new Error('Not signed in');
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var partA = '', partB = '';
      for (var i = 0; i < 4; i++) {
        partA += chars[Math.floor(Math.random() * chars.length)];
        partB += chars[Math.floor(Math.random() * chars.length)];
      }
      var code = partA + '-' + partB;
      var pairId = 'pair_' + partA;
      var box = global.JCA.sealJson({
        h: Engine.me.handle,
        p: Array.isArray(phraseWords) ? phraseWords.join(' ') : String(phraseWords || ''),
        ts: Date.now()
      }, partB + ':jchatt:pair');
      await Engine.db.ref('v2/pairings/' + pairId).set({
        box: box,
        handle: Engine.me.handle,
        ts: firebase.database.ServerValue.TIMESTAMP
      });
      return { code: code, pairId: pairId };
    },

    claimPairingCode: async function (rawCode) {
      Engine.init();
      var cleaned = String(rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length !== 8) {
        return { error: 'bad_code', message: 'Enter an 8-character pairing code (e.g. ABCD-EF23).' };
      }
      var partA = cleaned.slice(0, 4), partB = cleaned.slice(4, 8);
      var pairId = 'pair_' + partA;
      try {
        var snap = await Engine.db.ref('v2/pairings/' + pairId).once('value');
        var val = snap.val();
        if (!val || !val.box) {
          return { error: 'not_found', message: 'Pairing code expired or already used.' };
        }
        var payload = global.JCA.openJson(val.box, partB + ':jchatt:pair');
        var res = await Engine.restoreAccount(payload.h, payload.p);
        if (res.ok) {
          Engine.db.ref('v2/pairings/' + pairId).remove().catch(function () {});
        }
        return res;
      } catch (err) {
        return { error: 'decrypt_failed', message: 'Invalid or expired device link code.' };
      }
    },

    createInviteLink: async function (singleUse) {
      if (!Engine.uid || !Engine.me) throw new Error('Sign in required');
      var token = 'inv_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      await Engine.db.ref('v2/invites/' + token).set({
        token: token,
        uid: Engine.uid,
        handle: Engine.me.handle,
        name: Engine.me.name,
        avatar: Engine.me.avatar || '',
        maxUses: singleUse === false ? 25 : 1,
        used: 0,
        ts: firebase.database.ServerValue.TIMESTAMP
      });
      var base = (global.location && global.location.origin && global.location.origin.indexOf('http') === 0)
        ? (global.location.origin + global.location.pathname)
        : 'https://jjcodersjchatt.web.app/';
      return { token: token, url: base + '?invite=' + encodeURIComponent(token) };
    },

    peekInvite: async function (token) {
      Engine.init();
      var snap = await Engine.db.ref('v2/invites/' + token).once('value');
      return snap.val();
    },

    claimInvite: async function (token) {
      Engine.init();
      if (!Engine.uid) return { error: 'auth_required', message: 'Create or sign into your account first.' };
      var snap = await Engine.db.ref('v2/invites/' + token).once('value');
      var inv = snap.val();
      if (!inv || !inv.uid) return { error: 'not_found', message: 'Invite link invalid or expired.' };
      if (inv.uid === Engine.uid) return { error: 'self', message: 'That is your own invite link.' };
      if ((inv.used || 0) >= (inv.maxUses || 1)) {
        return { error: 'used', message: 'This one-time invite link has already been used.' };
      }
      var chatId = await Engine.startDmWith({
        uid: inv.uid,
        handle: inv.handle,
        name: inv.name,
        avatar: inv.avatar
      });
      var ref = Engine.db.ref('v2/invites/' + token);
      if ((inv.maxUses || 1) <= 1) {
        ref.remove().catch(function () {});
      } else {
        ref.child('used').transaction(function (n) { return (n || 0) + 1; }).catch(function () {});
      }
      return { ok: true, chatId: chatId, peer: inv };
    },

    // --- 3. Peer Lookup & Real Chats ---
    lookupHandle: async function (rawHandle) {
      Engine.init();
      var canon = global.JCA.normalizeHandle(rawHandle);
      if (!canon) return null;
      var hHash = global.JCA.sha256('jchatt:v2:handle:' + canon).slice(0, 32);
      var snap = await Engine.db.ref('v2/handles/' + hHash).once('value');
      var entry = snap.val();
      if (!entry || !entry.uid) return null;
      try {
        var uSnap = await Engine.db.ref('v2/users/' + entry.uid).once('value');
        if (uSnap.exists()) return uSnap.val();
      } catch (e) {}
      return entry;
    },

    dmChatId: function (uidA, uidB) {
      return 'dm_' + [String(uidA), String(uidB)].sort().join('__');
    },

    startDmWith: async function (peer) {
      if (!Engine.uid || !Engine.me) throw new Error('Not signed in');
      if (!peer || !peer.uid) throw new Error('Peer UID missing');
      if (peer.uid === Engine.uid) throw new Error('Cannot start a chat with yourself');
      var chatId = Engine.dmChatId(Engine.uid, peer.uid);
      var existing = Engine.chats[chatId];
      if (!existing) {
        var up = {};
        var nowTs = firebase.database.ServerValue.TIMESTAMP;
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/id'] = chatId;
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/kind'] = 'dm';
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/peerUid'] = peer.uid;
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/handle'] = peer.handle || '';
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/name'] = peer.name || peer.handle || 'Contact';
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/avatar'] = peer.avatar || global.JCA.pickAvatar(peer.handle || peer.uid);
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastTs'] = Date.now();
        up['v2/userChats/' + Engine.uid + '/' + chatId + '/unread'] = 0;

        // Also seed peer's inbox row so both sides see the thread cleanly (preserve peer local flags via child path updates)
        up['v2/userChats/' + peer.uid + '/' + chatId + '/id'] = chatId;
        up['v2/userChats/' + peer.uid + '/' + chatId + '/kind'] = 'dm';
        up['v2/userChats/' + peer.uid + '/' + chatId + '/peerUid'] = Engine.uid;
        up['v2/userChats/' + peer.uid + '/' + chatId + '/handle'] = Engine.me.handle;
        up['v2/userChats/' + peer.uid + '/' + chatId + '/name'] = Engine.me.name || Engine.me.handle;
        up['v2/userChats/' + peer.uid + '/' + chatId + '/avatar'] = Engine.me.avatar || global.JCA.pickAvatar(Engine.me.handle);
        up['v2/userChats/' + peer.uid + '/' + chatId + '/lastTs'] = nowTs;
        await Engine.db.ref().update(up);
      }
      return chatId;
    },

    createGroup: async function (name, memberList) {
      if (!Engine.uid || !Engine.me) throw new Error('Not signed in');
      var gName = (name || 'New Group').trim();
      var chatId = 'grp_' + uidShort();
      var members = {};
      members[Engine.uid] = { uid: Engine.uid, name: Engine.me.name, handle: Engine.me.handle, avatar: Engine.me.avatar || '', role: 'admin' };
      (memberList || []).forEach(function (m) {
        if (m && m.uid) {
          members[m.uid] = { uid: m.uid, name: m.name || m.handle, handle: m.handle || '', avatar: m.avatar || '', role: 'member' };
        }
      });
      var up = {};
      var nowTs = firebase.database.ServerValue.TIMESTAMP;
      var msgId = Engine.db.ref('v2/messages/' + chatId).push().key;
      up['v2/messages/' + chatId + '/' + msgId] = {
        id: msgId,
        from: 'system',
        fromName: 'System',
        kind: 'system',
        text: (Engine.me.name || Engine.me.handle) + ' created "' + gName + '"',
        ts: nowTs
      };
      Object.keys(members).forEach(function (mUid) {
        up['v2/userChats/' + mUid + '/' + chatId] = {
          id: chatId,
          kind: 'group',
          name: gName,
          avatar: '',
          members: members,
          lastText: 'Group created',
          lastTs: nowTs,
          unread: mUid === Engine.uid ? 0 : 1
        };
      });
      await Engine.db.ref().update(up);
      return chatId;
    },

    // --- 4. Active Chat Listener (.limitToLast(80)) & Messaging ---
    openChat: function (chatId) {
      if (Engine._activeChatId === chatId) {
        Engine.markChatRead(chatId);
        return;
      }
      Engine.closeActiveChat();
      Engine._activeChatId = chatId;
      if (!chatId || !Engine.uid) return;

      if (!Engine.messagesByChat[chatId]) Engine.messagesByChat[chatId] = {};
      var ref = Engine.db.ref('v2/messages/' + chatId).orderByChild('ts').limitToLast(80);
      Engine._activeChatRef = ref;

      ref.on('child_added', function (snap) {
        var val = snap.val();
        if (!val) return;
        val.id = val.id || snap.key;
        if (Engine.pendingByChat[chatId] && Engine.pendingByChat[chatId][val.id]) {
          delete Engine.pendingByChat[chatId][val.id];
        }
        Engine.messagesByChat[chatId][val.id] = val;
        if (val.from !== Engine.uid) {
          // Mark as delivered on receipt (Grey double tick)
          if (!val.deliveredTo || !val.deliveredTo[Engine.uid]) {
            Engine.db.ref('v2/messages/' + chatId + '/' + val.id + '/deliveredTo/' + Engine.uid).set(true).catch(function () {});
          }
        }
        if (Engine._activeChatId === chatId && val.from !== Engine.uid) {
          Engine.markMessageSeen(chatId, val);
          if (Engine.chats[chatId] && Engine.chats[chatId].unread) {
            Engine.chats[chatId].unread = 0;
            Engine.db.ref('v2/userChats/' + Engine.uid + '/' + chatId + '/unread').set(0).catch(function () {});
          }
        }
        Engine._emit('messages');
      });

      ref.on('child_changed', function (snap) {
        var val = snap.val();
        if (!val) return;
        val.id = val.id || snap.key;
        Engine.messagesByChat[chatId][val.id] = val;
        Engine._emit('messages');
      });

      ref.on('child_removed', function (snap) {
        if (Engine.messagesByChat[chatId]) {
          delete Engine.messagesByChat[chatId][snap.key];
          Engine._emit('messages');
        }
      });

      var tRef = Engine.db.ref('v2/typing/' + chatId);
      Engine._activeTypingRef = tRef;
      tRef.on('value', function (snap) {
        Engine.typingByChat[chatId] = snap.val() || {};
        Engine._emit('typing');
      });

      var meta = Engine.chats[chatId];
      if (meta && meta.peerUid) {
        Engine._activePeerUid = meta.peerUid;
        Engine._activePeerRef = Engine.db.ref('v2/users/' + meta.peerUid);
        Engine._activePeerRef.on('value', function (snap) {
          if (snap.exists()) {
            Engine.peerPresence[meta.peerUid] = snap.val();
            Engine._emit('presence');
          }
        });
      }
      Engine.markChatRead(chatId);
    },

    closeActiveChat: function () {
      if (Engine._activeChatRef) {
        Engine._activeChatRef.off();
        Engine._activeChatRef = null;
      }
      if (Engine._activeTypingRef) {
        if (Engine.uid && Engine._activeChatId) {
          Engine.db.ref('v2/typing/' + Engine._activeChatId + '/' + Engine.uid).remove().catch(function () {});
        }
        Engine._activeTypingRef.off();
        Engine._activeTypingRef = null;
      }
      if (Engine._activePeerRef) {
        Engine._activePeerRef.off();
        Engine._activePeerRef = null;
        Engine._activePeerUid = null;
      }
      Engine._activeChatId = null;
    },

    setTyping: function (chatId, isTyping) {
      if (!Engine.uid || !chatId) return;
      var ref = Engine.db.ref('v2/typing/' + chatId + '/' + Engine.uid);
      if (isTyping) {
        ref.set({ name: (Engine.me && Engine.me.name) || 'Peer', ts: Date.now() }).catch(function () {});
      } else {
        ref.remove().catch(function () {});
      }
    },

    markChatRead: function (chatId) {
      if (!Engine.uid || !chatId) return;
      var chat = Engine.chats[chatId];
      if (chat && chat.unread) {
        Engine.db.ref('v2/userChats/' + Engine.uid + '/' + chatId + '/unread').set(0).catch(function () {});
      }
      var msgs = Engine.messagesByChat[chatId] || {};
      Object.keys(msgs).forEach(function (mid) {
        Engine.markMessageSeen(chatId, msgs[mid]);
      });
    },

    markMessageSeen: function (chatId, msg) {
      if (!Engine.uid || !msg || !msg.id) return;
      if (msg.from === Engine.uid || msg.from === 'system') return;
      if (global.LV && global.LV.settings && global.LV.settings.readReceipts === false) return;
      var alreadySeen = msg.seenBy && msg.seenBy[Engine.uid];
      if (!alreadySeen) {
        Engine.db.ref('v2/messages/' + chatId + '/' + msg.id + '/seenBy/' + Engine.uid).set(true).catch(function () {});
        // Burn-after-reading starts 5s countdown once peer sees the message
        if (msg.timerMode === 'burn' && !msg.expAt) {
          Engine.db.ref('v2/messages/' + chatId + '/' + msg.id + '/expAt').set(Date.now() + 5000).catch(function () {});
        }
      }
    },

    getChatMessages: function (chatId) {
      var list = [];
      var now = Date.now();
      var persisted = Engine.messagesByChat[chatId] || {};
      var pending = Engine.pendingByChat[chatId] || {};
      var seenIds = {};
      Object.keys(persisted).forEach(function (id) {
        var m = persisted[id];
        if (!m) return;
        if (m.deletedFor && m.deletedFor[Engine.uid]) return;
        if (m.expAt && m.expAt > 0 && now >= m.expAt) return;
        seenIds[id] = true;
        list.push(m);
      });
      Object.keys(pending).forEach(function (id) {
        if (!seenIds[id]) list.push(pending[id]);
      });
      list.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      return list;
    },

    computeTick: function (msg) {
      if (!msg || msg.from !== Engine.uid) return null;
      if (msg._optimistic) return 0; // clock (sending)
      var seenBy = msg.seenBy || {};
      var peerRead = Object.keys(seenBy).some(function (u) { return u !== Engine.uid && seenBy[u]; });
      if (peerRead) return 3; // WhatsApp Blue Double Check (read/seen)
      var deliveredTo = msg.deliveredTo || {};
      var peerDelivered = Object.keys(deliveredTo).some(function (u) { return u !== Engine.uid && deliveredTo[u]; });
      if (peerDelivered) return 2; // WhatsApp Grey Double Check (delivered)
      return 1; // WhatsApp Single Grey Check (sent to server)
    },

    sendMessage: async function (chatId, payload) {
      if (!Engine.uid || !Engine.me || !chatId) return null;
      var chat = Engine.chats[chatId];
      if (!chat) return null;
      if (chat.peerUid && Engine.blocked[chat.peerUid]) {
        throw new Error('Unblock this contact before messaging');
      }

      var msgRef = Engine.db.ref('v2/messages/' + chatId).push();
      var msgId = msgRef.key;
      var now = Date.now();
      var timerId = (payload && payload.timer) || chat.timer || 'off';
      var timerObj = global.JCA.TIMERS.find(function (t) { return t.id === timerId; });
      var expAt = (timerObj && timerObj.sec > 0 && timerId !== 'burn') ? (now + timerObj.sec * 1000) : 0;

      var kind = (payload && payload.kind) || 'text';
      var text = (payload && payload.text) || '';
      var preview = Engine._msgPreview({ kind: kind, text: text, poll: payload && payload.poll });

      var record = {
        id: msgId,
        from: Engine.uid,
        fromName: Engine.me.name || Engine.me.handle,
        kind: kind,
        text: text,
        ts: now,
        timerMode: timerId,
        expAt: expAt,
        seenBy: (function () { var s = {}; s[Engine.uid] = true; return s; })()
      };
      if (payload && payload.replyTo) record.replyTo = payload.replyTo;
      if (payload && payload.imgData) record.imgData = payload.imgData;
      if (payload && payload.stickerUrl) record.stickerUrl = payload.stickerUrl;
      if (payload && payload.audioData) {
        record.audioData = payload.audioData;
        record.audioSec = payload.audioSec || 3;
      }
      if (payload && payload.poll) record.poll = payload.poll;
      if (payload && payload.loc) record.loc = payload.loc;
      if (payload && payload.contact) record.contact = payload.contact;
      if (payload && payload.doc) record.doc = payload.doc;
      if (payload && payload.viewOnce) record.viewOnce = true;

      // 1. Optimistic instant UI render (clock state)
      if (!Engine.pendingByChat[chatId]) Engine.pendingByChat[chatId] = {};
      Engine.pendingByChat[chatId][msgId] = Object.assign({}, record, { _optimistic: true });
      Engine.setTyping(chatId, false);
      Engine._emit('messages');

      // 2. Persist to Firebase RTDB (ServerValue.TIMESTAMP on server write)
      var serverRecord = Object.assign({}, record, { ts: firebase.database.ServerValue.TIMESTAMP });
      var up = {};
      up['v2/messages/' + chatId + '/' + msgId] = serverRecord;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastText'] = preview;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastTs'] = firebase.database.ServerValue.TIMESTAMP;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastFrom'] = Engine.uid;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastMsgId'] = msgId;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastExpAt'] = expAt || 0;
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/unread'] = 0;

      var recipients = [];
      if (chat.kind === 'group' && chat.members) {
        recipients = Object.keys(chat.members).filter(function (u) { return u !== Engine.uid; });
      } else if (chat.peerUid) {
        recipients = [chat.peerUid];
      }

      recipients.forEach(function (rUid) {
        up['v2/userChats/' + rUid + '/' + chatId + '/id'] = chatId;
        up['v2/userChats/' + rUid + '/' + chatId + '/kind'] = chat.kind || 'dm';
        if (chat.kind === 'group') {
          up['v2/userChats/' + rUid + '/' + chatId + '/name'] = chat.name;
          up['v2/userChats/' + rUid + '/' + chatId + '/members'] = chat.members;
        } else {
          up['v2/userChats/' + rUid + '/' + chatId + '/peerUid'] = Engine.uid;
          up['v2/userChats/' + rUid + '/' + chatId + '/name'] = Engine.me.name || Engine.me.handle;
          up['v2/userChats/' + rUid + '/' + chatId + '/handle'] = Engine.me.handle;
          up['v2/userChats/' + rUid + '/' + chatId + '/avatar'] = Engine.me.avatar || '';
        }
        up['v2/userChats/' + rUid + '/' + chatId + '/lastText'] = preview;
        up['v2/userChats/' + rUid + '/' + chatId + '/lastTs'] = firebase.database.ServerValue.TIMESTAMP;
        up['v2/userChats/' + rUid + '/' + chatId + '/lastFrom'] = Engine.uid;
        up['v2/userChats/' + rUid + '/' + chatId + '/lastMsgId'] = msgId;
        up['v2/userChats/' + rUid + '/' + chatId + '/lastExpAt'] = expAt || 0;
        up['v2/userChats/' + rUid + '/' + chatId + '/unread'] = firebase.database.ServerValue.increment(1);
      });

      await Engine.db.ref().update(up);
      if (Engine.pendingByChat[chatId]) delete Engine.pendingByChat[chatId][msgId];
      Engine._emit('messages');
      return msgId;
    },

    toggleReaction: async function (chatId, msgId, emoji) {
      if (!Engine.uid || !chatId || !msgId) return;
      var msg = (Engine.messagesByChat[chatId] || {})[msgId];
      var cur = msg && msg.reactions && msg.reactions[Engine.uid];
      await Engine.db.ref('v2/messages/' + chatId + '/' + msgId + '/reactions/' + Engine.uid).set(cur === emoji ? null : emoji);
    },

    votePoll: async function (chatId, msgId, optIdx) {
      if (!Engine.uid || !chatId || !msgId) return;
      await Engine.db.ref('v2/messages/' + chatId + '/' + msgId + '/poll/votes/' + Engine.uid).set(optIdx);
    },

    markViewOnceOpened: async function (chatId, msgId) {
      if (!Engine.uid || !chatId || !msgId) return;
      await Engine.db.ref('v2/messages/' + chatId + '/' + msgId + '/openedBy/' + Engine.uid).set(true);
    },

    deleteMessage: async function (chatId, msgId, forEveryone) {
      if (!Engine.uid || !chatId || !msgId) return;
      var msg = (Engine.messagesByChat[chatId] || {})[msgId];
      if (forEveryone && msg && msg.from === Engine.uid) {
        await Engine.db.ref('v2/messages/' + chatId + '/' + msgId).update({
          deleted: true,
          kind: 'deleted',
          text: 'This message was deleted',
          imgData: null,
          audioData: null,
          stickerUrl: null,
          poll: null
        });
      } else {
        await Engine.db.ref('v2/messages/' + chatId + '/' + msgId + '/deletedFor/' + Engine.uid).set(true);
      }
    },

    updateChatMeta: async function (chatId, patch) {
      if (!Engine.uid || !chatId) return;
      if (Engine.chats[chatId] && patch) {
        Object.keys(patch).forEach(function (k) { Engine.chats[chatId][k] = patch[k]; });
        Engine._emit('chats');
      }
      await Engine.db.ref('v2/userChats/' + Engine.uid + '/' + chatId).update(patch);
    },

    clearChatMessages: async function (chatId) {
      if (!Engine.uid || !chatId) return;
      var msgs = Engine.messagesByChat[chatId] || {};
      var up = {};
      Object.keys(msgs).forEach(function (mid) {
        up['v2/messages/' + chatId + '/' + mid + '/deletedFor/' + Engine.uid] = true;
      });
      up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastText'] = '';
      await Engine.db.ref().update(up);
    },

    deleteChatForMe: async function (chatId) {
      if (!Engine.uid || !chatId) return;
      await Engine.db.ref('v2/userChats/' + Engine.uid + '/' + chatId).remove();
      if (Engine._activeChatId === chatId) Engine.closeActiveChat();
    },

    setBlocked: async function (peerUid, isBlocked) {
      if (!Engine.uid || !peerUid) return;
      await Engine.db.ref('v2/blocked/' + Engine.uid + '/' + peerUid).set(isBlocked ? true : null);
    },

    _msgPreview: function (m) {
      if (!m) return '';
      if (m.text) return m.text;
      var k = m.kind || 'text';
      return k === 'photo' ? 'Photo'
        : k === 'sticker' ? 'Sticker'
        : k === 'voice' ? 'Voice message'
        : k === 'poll' ? ('Poll: ' + (m.poll ? m.poll.q : ''))
        : k === 'loc' ? 'Location pin'
        : k === 'contact' ? 'Contact card'
        : k === 'doc' ? 'Document'
        : 'Message';
    },

    _sweepExpiredMessages: function () {
      var now = Date.now();
      var dirty = false;
      var chatDirty = false;
      var sweptOwnChats = {};
      var sweptAnyChats = {};
      Object.keys(Engine.messagesByChat).forEach(function (chatId) {
        var box = Engine.messagesByChat[chatId];
        Object.keys(box).forEach(function (mid) {
          var m = box[mid];
          if (m && m.expAt && m.expAt > 0 && now >= m.expAt) {
            dirty = true;
            sweptAnyChats[chatId] = sweptAnyChats[chatId] || [];
            sweptAnyChats[chatId].push(m);
            if (m.from === Engine.uid) {
              sweptOwnChats[chatId] = sweptOwnChats[chatId] || [];
              sweptOwnChats[chatId].push(m);
              Engine.db.ref('v2/messages/' + chatId + '/' + mid).remove().catch(function () {});
            }
            delete box[mid];
          }
        });
      });

      var up = {};
      var hasMetaUpdate = false;
      Object.keys(Engine.chats).forEach(function (chatId) {
        var c = Engine.chats[chatId];
        if (!c) return;
        var sweptList = sweptAnyChats[chatId];
        var hitExpPreview = c.lastExpAt && c.lastExpAt > 0 && now >= c.lastExpAt;
        var hitSweptText = sweptList && sweptList.some(function (m) {
          return m.id === c.lastMsgId || (m.text && c.lastText === m.text);
        });
        if (!hitExpPreview && !hitSweptText) return;

        var rem = Engine.getChatMessages(chatId);
        var lastRem = rem.length ? rem[rem.length - 1] : null;
        var fallback = lastRem ? Engine._msgPreview(lastRem) : 'Disappearing message expired';

        c.lastText = fallback;
        c.lastExpAt = (lastRem && lastRem.expAt) || 0;
        c.lastMsgId = lastRem ? lastRem.id : '';
        chatDirty = true;

        if (Engine.uid) {
          up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastText'] = fallback;
          up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastExpAt'] = c.lastExpAt;
          up['v2/userChats/' + Engine.uid + '/' + chatId + '/lastMsgId'] = c.lastMsgId;
          hasMetaUpdate = true;
          if (sweptOwnChats[chatId] && sweptOwnChats[chatId].length) {
            var targets = (c.kind === 'group' && c.members)
              ? Object.keys(c.members).filter(function (u) { return u !== Engine.uid; })
              : (c.peerUid ? [c.peerUid] : []);
            targets.forEach(function (rUid) {
              up['v2/userChats/' + rUid + '/' + chatId + '/lastText'] = fallback;
              up['v2/userChats/' + rUid + '/' + chatId + '/lastExpAt'] = c.lastExpAt;
              up['v2/userChats/' + rUid + '/' + chatId + '/lastMsgId'] = c.lastMsgId;
            });
          }
        }
      });

      if (hasMetaUpdate) Engine.db.ref().update(up).catch(function () {});
      if (dirty) Engine._emit('vanish');
      if (chatDirty) Engine._emit('chats');
    },

    // --- 5. Statuses (/v2/statuses) ---
    postStatus: async function (text, bg, imgData) {
      if (!Engine.uid || !Engine.me) throw new Error('Not signed in');
      var ref = Engine.db.ref('v2/statuses').push();
      var sid = ref.key;
      await ref.set({
        id: sid,
        uid: Engine.uid,
        name: Engine.me.name || Engine.me.handle,
        handle: Engine.me.handle,
        avatar: Engine.me.avatar || '',
        text: text || '',
        bg: bg || '#0a2230',
        imgData: imgData || null,
        ts: firebase.database.ServerValue.TIMESTAMP,
        expAt: Date.now() + 86400000
      });
      return sid;
    },

    markStatusViewed: function (statusId) {
      if (!Engine.uid || !statusId) return;
      Engine.db.ref('v2/statuses/' + statusId + '/viewers/' + Engine.uid).set({
        uid: Engine.uid,
        name: (Engine.me && (Engine.me.name || Engine.me.handle)) || 'You',
        ts: Date.now()
      }).catch(function () {});
    },

    getVisibleStatuses: function () {
      if (!Engine.uid) return [];
      var now = Date.now();
      var contactUids = {};
      contactUids[Engine.uid] = true;
      Object.keys(Engine.chats).forEach(function (cid) {
        var c = Engine.chats[cid];
        if (c.peerUid) contactUids[c.peerUid] = true;
        if (c.members) Object.keys(c.members).forEach(function (m) { contactUids[m] = true; });
      });
      return Object.keys(Engine.statuses)
        .map(function (k) { return Engine.statuses[k]; })
        .filter(function (s) {
          return s && (!s.expAt || s.expAt > now) && contactUids[s.uid] && !Engine.blocked[s.uid];
        })
        .sort(function (a, b) {
          if (a.uid === Engine.uid && b.uid !== Engine.uid) return -1;
          if (b.uid === Engine.uid && a.uid !== Engine.uid) return 1;
          return (b.ts || 0) - (a.ts || 0);
        });
    },

    // --- 6. WebRTC Real Phone-to-Phone Calls & Call Logs ---
    _attachRemoteAudio: function (stream) {
      if (!stream) return;
      var el = document.getElementById('webrtc-call-audio');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'webrtc-call-audio';
        el.autoplay = true;
        el.playsInline = true;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(function () {});
      }
    },

    startCall: async function (peer, isVideo) {
      if (!Engine.uid || !Engine.me || !peer || !peer.uid) throw new Error('Peer missing');
      var callId = 'call_' + uidShort();
      Engine.activeCall = {
        callId: callId,
        peer: peer,
        video: !!isVideo,
        outgoing: true,
        status: 'calling',
        startedAt: Date.now(),
        muted: false,
        speaker: true
      };
      if (global.JCSOUND) global.JCSOUND.playRingback();
      Engine._emit('call');

      var stream = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: !!isVideo
          });
        }
      } catch (e) { stream = null; }
      Engine._localStream = stream;

      var offer = null;
      var pendingCalleeCandidates = [];
      if (typeof RTCPeerConnection !== 'undefined') {
        var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        Engine._pc = pc;
        try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch (e) {}
        if (isVideo) { try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch (e) {} }
        if (stream) stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
        pc.ontrack = function (ev) {
          if (ev.streams && ev.streams[0]) {
            Engine._remoteStream = ev.streams[0];
          } else {
            if (!Engine._remoteStream) Engine._remoteStream = new MediaStream();
            Engine._remoteStream.addTrack(ev.track);
          }
          Engine._attachRemoteAudio(Engine._remoteStream);
          Engine._emit('call_media');
        };
        pc.onicecandidate = function (ev) {
          if (ev.candidate) {
            Engine.db.ref('v2/callSignals/' + callId + '/callerCandidates').push(ev.candidate.toJSON()).catch(function () {});
          }
        };
        try {
          var sdpOffer = await pc.createOffer();
          await pc.setLocalDescription(sdpOffer);
          offer = { type: sdpOffer.type, sdp: sdpOffer.sdp };
        } catch (err) {}
      }

      await Engine.db.ref('v2/calls/' + peer.uid + '/' + callId).set({
        callId: callId,
        from: Engine.uid,
        fromName: Engine.me.name || Engine.me.handle,
        fromHandle: Engine.me.handle,
        fromAvatar: Engine.me.avatar || '',
        to: peer.uid,
        video: !!isVideo,
        status: 'ringing',
        offer: offer,
        ts: firebase.database.ServerValue.TIMESTAMP
      });

      var sigRef = Engine.db.ref('v2/calls/' + peer.uid + '/' + callId);
      Engine._callSignalRef = sigRef;
      sigRef.on('value', async function (snap) {
        var data = snap.val();
        if (!data || !Engine.activeCall || Engine.activeCall.callId !== callId) return;
        if (data.status === 'connected' && data.answer && Engine._pc && !Engine._pc.currentRemoteDescription) {
          try {
            await Engine._pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            while (pendingCalleeCandidates.length > 0) {
              var c = pendingCalleeCandidates.shift();
              try { await Engine._pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
            }
          } catch (e) {}
          Engine.activeCall.status = 'connected';
          Engine.activeCall.connectedAt = Date.now();
          if (global.JCSOUND) {
            global.JCSOUND.stopAll();
            global.JCSOUND.playCallConnected();
          }
          Engine._emit('call');
        } else if (data.status === 'ended' || data.status === 'declined') {
          Engine.endCall(true);
        }
      });

      Engine.db.ref('v2/callSignals/' + callId + '/calleeCandidates').on('child_added', function (snap) {
        var cand = snap.val();
        if (!cand || !Engine._pc) return;
        if (!Engine._pc.remoteDescription || !Engine._pc.remoteDescription.type) {
          pendingCalleeCandidates.push(cand);
        } else {
          Engine._pc.addIceCandidate(new RTCIceCandidate(cand)).catch(function () {});
        }
      });

      return callId;
    },

    answerCall: async function (inc) {
      if (!Engine.uid || !inc || !inc.callId) return;
      var callId = inc.callId;
      Engine.incomingCall = null;
      if (global.JCSOUND) global.JCSOUND.stopAll();
      Engine.activeCall = {
        callId: callId,
        peer: { uid: inc.from, name: inc.fromName, handle: inc.fromHandle, avatar: inc.fromAvatar },
        video: !!inc.video,
        outgoing: false,
        status: 'connected',
        startedAt: Date.now(),
        connectedAt: Date.now(),
        muted: false,
        speaker: true
      };
      Engine._emit('call');

      var stream = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: !!inc.video
          });
        }
      } catch (e) { stream = null; }
      Engine._localStream = stream;

      var answer = null;
      var pendingCallerCandidates = [];
      if (typeof RTCPeerConnection !== 'undefined' && inc.offer) {
        var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        Engine._pc = pc;
        try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch (e) {}
        if (inc.video) { try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch (e) {} }
        if (stream) stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
        pc.ontrack = function (ev) {
          if (ev.streams && ev.streams[0]) {
            Engine._remoteStream = ev.streams[0];
          } else {
            if (!Engine._remoteStream) Engine._remoteStream = new MediaStream();
            Engine._remoteStream.addTrack(ev.track);
          }
          Engine._attachRemoteAudio(Engine._remoteStream);
          Engine._emit('call_media');
        };
        pc.onicecandidate = function (ev) {
          if (ev.candidate) {
            Engine.db.ref('v2/callSignals/' + callId + '/calleeCandidates').push(ev.candidate.toJSON()).catch(function () {});
          }
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(inc.offer));
          var ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          answer = { type: ans.type, sdp: ans.sdp };
        } catch (err) {}
      }

      var myCallRef = Engine.db.ref('v2/calls/' + Engine.uid + '/' + callId);
      Engine._callSignalRef = myCallRef;
      await myCallRef.update({ status: 'connected', answer: answer });
      if (global.JCSOUND) global.JCSOUND.playCallConnected();
      while (pendingCallerCandidates.length > 0) {
        var c = pendingCallerCandidates.shift();
        try { await Engine._pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
      }
      myCallRef.on('value', function (snap) {
        var d = snap.val();
        if (d && d.status === 'ended') Engine.endCall(true);
      });
      Engine.db.ref('v2/callSignals/' + callId + '/callerCandidates').on('child_added', function (snap) {
        var cand = snap.val();
        if (!cand || !Engine._pc) return;
        if (!Engine._pc.remoteDescription || !Engine._pc.remoteDescription.type) {
          pendingCallerCandidates.push(cand);
        } else {
          Engine._pc.addIceCandidate(new RTCIceCandidate(cand)).catch(function () {});
        }
      });
    },

    declineCall: async function (inc) {
      if (!Engine.uid || !inc || !inc.callId) return;
      Engine.incomingCall = null;
      if (global.JCSOUND) global.JCSOUND.stopAll();
      await Engine.db.ref('v2/calls/' + Engine.uid + '/' + inc.callId).update({ status: 'declined' }).catch(function () {});
      Engine._emit('call');
    },

    endCall: async function (fromRemote) {
      var call = Engine.activeCall;
      if (global.JCSOUND) {
        global.JCSOUND.stopAll();
        global.JCSOUND.playCallEnded();
      }
      var aEl = document.getElementById('webrtc-call-audio');
      if (aEl) {
        aEl.srcObject = null;
        try { aEl.pause(); } catch (e) {}
      }
      if (call) {
        var targetUid = call.outgoing ? call.peer.uid : Engine.uid;
        if (!fromRemote && targetUid) {
          Engine.db.ref('v2/calls/' + targetUid + '/' + call.callId).update({ status: 'ended' }).catch(function () {});
        }
        var durSec = call.connectedAt ? Math.max(1, Math.round((Date.now() - call.connectedAt) / 1000)) : 0;
        if (Engine.uid) {
          var logId = 'clog_' + uidShort();
          Engine.db.ref('v2/callLogs/' + Engine.uid + '/' + logId).set({
            id: logId,
            peerUid: call.peer.uid,
            name: call.peer.name || call.peer.handle,
            handle: call.peer.handle || '',
            avatar: call.peer.avatar || '',
            video: !!call.video,
            incoming: !call.outgoing,
            durSec: durSec,
            ts: firebase.database.ServerValue.TIMESTAMP
          }).catch(function () {});
        }
      }
      if (Engine._callSignalRef) { Engine._callSignalRef.off(); Engine._callSignalRef = null; }
      if (Engine._pc) { try { Engine._pc.close(); } catch (e) {} Engine._pc = null; }
      if (Engine._localStream) {
        Engine._localStream.getTracks().forEach(function (t) { t.stop(); });
        Engine._localStream = null;
      }
      Engine._remoteStream = null;
      Engine.activeCall = null;
      Engine._emit('call');
    },

    endCall: async function (fromRemote) {
      var call = Engine.activeCall;
      if (call) {
        var targetUid = call.outgoing ? call.peer.uid : Engine.uid;
        if (!fromRemote && targetUid) {
          Engine.db.ref('v2/calls/' + targetUid + '/' + call.callId).update({ status: 'ended' }).catch(function () {});
        }
        var durSec = call.connectedAt ? Math.max(1, Math.round((Date.now() - call.connectedAt) / 1000)) : 0;
        if (Engine.uid) {
          var logId = 'clog_' + uidShort();
          Engine.db.ref('v2/callLogs/' + Engine.uid + '/' + logId).set({
            id: logId,
            peerUid: call.peer.uid,
            name: call.peer.name || call.peer.handle,
            handle: call.peer.handle || '',
            avatar: call.peer.avatar || '',
            video: !!call.video,
            dir: call.outgoing ? 'out' : 'in',
            durSec: durSec,
            missed: !call.connectedAt && !call.outgoing,
            ts: firebase.database.ServerValue.TIMESTAMP
          }).catch(function () {});
        }
        Engine.db.ref('v2/callSignals/' + call.callId).off();
      }
      if (Engine._callSignalRef) { Engine._callSignalRef.off(); Engine._callSignalRef = null; }
      if (Engine._pc) { try { Engine._pc.close(); } catch (e) {} Engine._pc = null; }
      if (Engine._localStream) {
        Engine._localStream.getTracks().forEach(function (t) { t.stop(); });
        Engine._localStream = null;
      }
      Engine._remoteStream = null;
      Engine.activeCall = null;
      Engine._emit('call');
    },

    toggleCallMute: function () {
      if (!Engine.activeCall) return;
      Engine.activeCall.muted = !Engine.activeCall.muted;
      if (Engine._localStream) {
        Engine._localStream.getAudioTracks().forEach(function (t) { t.enabled = !Engine.activeCall.muted; });
      }
      Engine._emit('call');
    },

    // --- 7. Media Compression Helpers (Direct RTDB Data URLs, Zero Storage CORS) ---
    compressImageFile: function (file, maxPx, quality) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('Could not read image')); };
        reader.onload = function (ev) {
          var img = new Image();
          img.onerror = function () { reject(new Error('Invalid image format')); };
          img.onload = function () {
            var m = maxPx || 720;
            var w = img.width, h = img.height;
            if (w > m || h > m) {
              if (w >= h) { h = Math.round(h * m / w); w = m; }
              else { w = Math.round(w * m / h); h = m; }
            }
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality || 0.72));
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    // --- 8. Internal Subscription Management ---
    _attachGlobalListeners: function (uid) {
      Engine._detachAllListeners();
      var presRef = Engine.db.ref('v2/users/' + uid);
      presRef.update({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(function () {});

      Engine._userChatsRef = Engine.db.ref('v2/userChats/' + uid).orderByChild('lastTs');
      Engine._userChatsRef.on('value', function (snap) {
        var oldChats = Engine.chats || {};
        var newChats = snap.val() || {};
        // Auto-deliver all pending messages across all chats when app is active!
        Object.keys(newChats).forEach(function (cId) {
          var ch = newChats[cId];
          if (ch && ch.lastMsgId && ch.lastFrom && ch.lastFrom !== uid) {
            Engine.db.ref('v2/messages/' + cId + '/' + ch.lastMsgId + '/deliveredTo/' + uid).set(true).catch(function () {});
            // Notify if new message arrived
            var prevChat = oldChats[cId];
            if (!prevChat || prevChat.lastMsgId !== ch.lastMsgId) {
              if (global.JCSOUND && (Date.now() - (ch.lastTs || 0) < 60000)) {
                var sName = ch.name || ch.handle || 'New Message';
                var sBody = ch.lastText || 'New encrypted message';
                global.JCSOUND.sendNotification(sName, sBody);
              }
            }
          }
        });
        Engine.chats = newChats;
        if (Engine._activeChatId && Engine.chats[Engine._activeChatId] && Engine.chats[Engine._activeChatId].unread > 0) {
          Engine.chats[Engine._activeChatId].unread = 0;
          Engine.db.ref('v2/userChats/' + uid + '/' + Engine._activeChatId + '/unread').set(0).catch(function () {});
        }
        Engine._emit('chats');
      });

      Engine._statusesRef = Engine.db.ref('v2/statuses').orderByChild('ts').limitToLast(40);
      Engine._statusesRef.on('value', function (snap) {
        Engine.statuses = snap.val() || {};
        Engine._emit('statuses');
      });

      Engine._callLogsRef = Engine.db.ref('v2/callLogs/' + uid).orderByChild('ts').limitToLast(40);
      Engine._callLogsRef.on('value', function (snap) {
        Engine.callLogs = snap.val() || {};
        Engine._emit('calls');
      });

      Engine._blockedRef = Engine.db.ref('v2/blocked/' + uid);
      Engine._blockedRef.on('value', function (snap) {
        Engine.blocked = snap.val() || {};
        Engine._emit('blocked');
      });

      Engine._incomingCallsRef = Engine.db.ref('v2/calls/' + uid).orderByChild('ts').limitToLast(5);
      Engine._incomingCallsRef.on('value', function (snap) {
        var val = snap.val() || {};
        var now = Date.now();
        var ringing = Object.keys(val).map(function (k) { return val[k]; })
          .filter(function (c) { return c && c.status === 'ringing' && (!c.ts || now - c.ts < 60000); })
          .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })[0] || null;
        Engine.incomingCall = ringing;
        Engine._emit('incoming_call');
      });
    },

    _detachAllListeners: function () {
      Engine.closeActiveChat();
      if (Engine._userChatsRef) { Engine._userChatsRef.off(); Engine._userChatsRef = null; }
      if (Engine._statusesRef) { Engine._statusesRef.off(); Engine._statusesRef = null; }
      if (Engine._callLogsRef) { Engine._callLogsRef.off(); Engine._callLogsRef = null; }
      if (Engine._blockedRef) { Engine._blockedRef.off(); Engine._blockedRef = null; }
      if (Engine._incomingCallsRef) { Engine._incomingCallsRef.off(); Engine._incomingCallsRef = null; }
    },

    _resetMirrors: function () {
      Engine.chats = {};
      Engine.messagesByChat = {};
      Engine.pendingByChat = {};
      Engine.typingByChat = {};
      Engine.peerPresence = {};
      Engine.statuses = {};
      Engine.callLogs = {};
      Engine.blocked = {};
      Engine.incomingCall = null;
      Engine.activeCall = null;
    }
  };

  global.JFE = Engine;
})(window);
