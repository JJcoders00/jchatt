/* ===== JCHATT v2 LIVE STORE, PRIMITIVES & CORE SCREENS ===== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'jchatt_v2_prefs_v1';

  var DEFAULT_PREFS = {
    onboarded: false,
    phrase: [],
    phraseBackedUp: false,
    theme: 'default',     // 'default' | 'mint' | 'blue'
    darkMode: false,
    disguise: 'default',  // 'default' | 'calc' | 'notes' | 'weather' | 'clock' | 'fit'
    notifPreset: 'neutral',
    notifHidePreview: true,
    hideScreenInRecents: true,
    lockPin: '',          // 4-digit real unlock PIN (empty = off)
    duressPin: '',        // 4-digit duress PIN -> opens decoy inbox
    vaultPin: '',
    appLock: false,
    biometric: false,
    readReceipts: true,
    typingIndicators: true,
    relayCalls: false,
    onionRoute: false,
    blockScreenshots: true,
    incognitoKeyboard: true,
    largeText: false,
    reducedMotion: false,
    highContrast: false,
    soundEffects: true,
    vibration: true,
    language: 'English (Global)',
    autoDownloadWifi: true,
    autoDownloadCell: false,
    starredIds: {},       // msgId -> true
    pinnedMsgIds: {},     // chatId -> { msgId -> true }
    vaultChatIds: {},     // chatId -> true
    folders: [
      { id: 'all', name: 'All' },
      { id: 'unread', name: 'Unread' },
      { id: 'groups', name: 'Groups' }
    ],
    scheduled: [],        // [{ id, chatId, text, sendAt }]
    notesList: [
      { id: 'n1', title: 'Grocery list', body: 'Oat milk, sourdough, avocados, cold brew', time: '09:15' },
      { id: 'n2', title: 'Project milestones', body: 'Finalize Q4 design tokens and QA sweep', time: 'Yesterday' }
    ],
    walletBalance: 2450,
    walletHistory: [],    // real local ledger of test/user actions (empty initially or user entries)
    streakDays: 1,
    activeMode: 'Standard',
    selectedDomainData: {}
  };

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_PREFS);
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_PREFS, parsed || {});
    } catch (e) {
      return Object.assign({}, DEFAULT_PREFS);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(LV.settings));
    } catch (e) {}
  }

  var LV = {
    settings: loadPrefs(),
    route: 'splash',
    hist: [],
    anim: '',
    curChatId: null,
    filter: 'all',
    searchQ: '',
    chatSearchQ: '',
    replyTo: null,
    selMsgId: null,
    pendingTimer: null,
    pendingPhoto: null,     // { dataUrl, viewOnce }
    pendingVoice: null,
    voiceRecording: false,
    voiceSeconds: 0,
    duressMode: false,
    locked: false,
    vaultUnlocked: false,
    calcDisplay: '0',
    calcAcc: null,
    calcOp: null,
    calcReset: false,
    pinBuffer: '',
    pinMode: 'app',
    draftCreate: { handle: '', name: '', mask: 'Personal', error: '' },
    draftRestore: { tab: 'phrase', handle: '', phrase: '', code: '', error: '', busy: false },
    draftAdd: { handle: '', result: null, error: '', searching: false },
    draftGroup: { name: '', picked: {} },
    draftPoll: { q: '', opts: ['', '', ''] },
    draftStatus: { text: '', bg: '#0a2230', imgData: null },
    viewingStatusId: null,
    viewingPeerProfile: null,
    viewingPhoto: null,
    viewingDoc: null,
    activeDomain: null,
    aiPromptResult: '',
    // Desktop workspace state
    wtab: 'chats',          // 'chats' | 'updates' | 'calls' | 'shield' | 'settings'
    winfo: true,
    wmodal: null,           // null | 'search' | 'new-chat' | 'add-contact' | 'group-new' | 'qr' | 'timer-sheet' | 'attach-sheet' | 'stickers' | 'poll-create' | 'safety' | 'msg-actions' | 'forward-picker' | 'photo-view' | 'status-compose' | 'status-view' | 'voice-record' | 'incoming-call'
    wSettingsPage: 'profile-edit',
    pendingInviteToken: null,
    pendingInvitePreview: null,
    lastCallSummary: null,

    save: savePrefs,
    resetAllPrefs: function () {
      LV.settings = Object.assign({}, DEFAULT_PREFS);
      savePrefs();
    }
  };

  // Strict isolated decoy data ONLY rendered behind Duress PIN ('duress-decoy' or LV.duressMode)
  var DURESS_CHATS = [
    { id: 'decoy-1', name: 'Mom', handle: '@mom', lastText: 'Remember to bring the umbrella today!', time: '10:12', msgs: [
      { from: 'peer', text: 'Did you get the groceries on your way?', time: '10:10' },
      { from: 'me', text: 'Yes, picking up milk and bread now.', time: '10:11' },
      { from: 'peer', text: 'Remember to bring the umbrella today!', time: '10:12' }
    ]},
    { id: 'decoy-2', name: 'Office Catering', handle: '@catering', lastText: 'Lunch boxes arrive at 12:30 PM', time: 'Yesterday', msgs: [
      { from: 'peer', text: 'Lunch boxes arrive at 12:30 PM at lobby desk.', time: 'Yesterday' }
    ]}
  ];

  // --- Shared UI Primitives ---
  function E(s) { return global.JCA.escHtml(s); }
  function I(name, size) { return global.JCA.ic(name, size); }

  function av(seed, sz, photoUrl, online) {
    var html = global.JCA.face(seed, sz || 44, photoUrl);
    if (online) return '<span class="avw">' + html + '<i class="onl"></i></span>';
    return html;
  }

  function rb(iconName, attr) {
    return '<button class="rb" ' + (attr || '') + '>' + I(iconName, 20) + '</button>';
  }

  function backBtn(toRoute) {
    return '<button class="rb o" ' + (toRoute ? 'data-go="' + E(toRoute) + '"' : 'data-back="1"') + '>' + I('back', 20) + '</button>';
  }

  function hdr(title, sub, leftHtml, rightHtml) {
    return '<div class="top">'
      + (leftHtml || '')
      + '<div class="ttl">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</div>'
      + (rightHtml || '')
      + '</div>';
  }

  function btn(label, cls, attr) {
    return '<button class="btn ' + (cls || '') + '" ' + (attr || '') + '>' + label + '</button>';
  }

  function chip(id, label, active) {
    return '<button class="chip ' + (active ? 'on' : '') + '" data-act="filt" data-v="' + E(id) + '">' + E(label) + '</button>';
  }

  function ico(name, cls, sz) {
    return '<span class="ico ' + (cls || '') + '">' + I(name, sz || 20) + '</span>';
  }

  function togRow(iconName, iconCls, title, sub, isOn, toggleKey, extraAttr) {
    return '<button class="row" data-act="tg" data-k="' + E(toggleKey) + '" ' + (extraAttr || '') + '>'
      + ico(iconName, iconCls)
      + '<div class="rt"><b>' + E(title) + '</b>' + (sub ? '<p>' + E(sub) + '</p>' : '') + '</div>'
      + '<span class="sw ' + (isOn ? 'on' : '') + '"></span>'
      + '</button>';
  }

  function row(leadHtml, title, sub, metaHtml, attr, cls) {
    return '<button class="row ' + (cls || '') + '" ' + (attr || '') + '>'
      + leadHtml
      + '<div class="rt"><b><span>' + title + '</span>' + (metaHtml ? '<em>' + metaHtml + '</em>' : '') + '</b>'
      + (sub ? '<p>' + sub + '</p>' : '')
      + '</div></button>';
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function navBar(activeTab) {
    var tabs = [
      ['chats', 'chats', 'Chats'],
      ['updates', 'updates', 'Updates'],
      ['calls', 'calls', 'Calls'],
      ['shield', 'shield', 'Shield'],
      ['settings', 'settings', 'You']
    ];
    return '<div class="nav">' + tabs.map(function (t) {
      var on = activeTab === t[0];
      return '<button class="' + (on ? 'on' : '') + '" data-tab="' + t[0] + '">' + I(t[1], 19) + '<span>' + t[2] + '</span></button>';
    }).join('') + '</div>';
  }

  function emptyP(iconName, title, sub, ctasHtml) {
    return '<div class="empty">'
      + ico(iconName, 'lime', 28)
      + '<h3>' + E(title) + '</h3>'
      + '<p>' + E(sub) + '</p>'
      + (ctasHtml ? '<div style="display:grid;gap:8px;width:min(260px,100%);margin-top:8px">' + ctasHtml + '</div>' : '')
      + '</div>';
  }

  function skList(n) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) {
      out += '<div class="skr"><span class="sk c" style="width:46px;height:46px"></span><div><span class="sk" style="height:13px;width:' + (55 + (i % 3) * 14) + '%"></span><span class="sk" style="height:10px;width:' + (40 + (i % 2) * 28) + '%"></span></div></div>';
    }
    return out;
  }

  function sheet(title, bodyHtml, closeTarget) {
    var closeAttr = closeTarget ? 'data-go="' + E(closeTarget) + '"' : 'data-back="1"';
    return '<div class="scrim" ' + closeAttr + '></div>'
      + '<div class="sheet"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">' + E(title) + '</h3>'
      + '<button class="rb" style="width:34px;height:34px;background:var(--in)" ' + closeAttr + '>' + I('close', 17) + '</button></div>'
      + bodyHtml + '</div>';
  }

  function sortedChats(includeArchived) {
    var Engine = global.JFE;
    var list = Object.keys(Engine.chats || {}).map(function (k) { return Engine.chats[k]; }).filter(Boolean);
    if (!includeArchived) list = list.filter(function (c) { return !c.archived; });
    list.sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });
    return list;
  }

  function knownContacts() {
    var Engine = global.JFE;
    var seen = {};
    var out = [];
    Object.keys(Engine.chats || {}).forEach(function (cid) {
      var c = Engine.chats[cid];
      if (c && c.kind === 'dm' && c.peerUid && !seen[c.peerUid]) {
        seen[c.peerUid] = true;
        out.push({ uid: c.peerUid, name: c.name || c.handle, handle: c.handle || '', avatar: c.avatar || '', chatId: c.id });
      }
    });
    return out;
  }

  function shieldScore() {
    var s = LV.settings;
    var pts = 40;
    if (s.phraseBackedUp) pts += 15;
    if (s.appLock) pts += 15;
    if (s.duressPin) pts += 10;
    if (s.disguise && s.disguise !== 'default') pts += 10;
    if (s.hideScreenInRecents) pts += 5;
    if (s.blockScreenshots) pts += 5;
    return Math.min(100, pts);
  }

  // --- Conversation Message Renderer (Shared by Mobile & Desktop Web) ---
  function renderMessagesList(chatId) {
    var Engine = global.JFE;
    var msgs = Engine.getChatMessages(chatId);
    var chat = Engine.chats[chatId] || {};
    var myUid = Engine.uid;
    var typ = Engine.typingByChat[chatId] || {};
    var peerTyping = Object.keys(typ).some(function (u) {
      return u !== myUid && typ[u] && (Date.now() - (typ[u].ts || 0) < 8000);
    });

    if (!msgs.length && !peerTyping) {
      return '<div class="empty" style="padding:36px 20px">'
        + global.JCA.mascot('wave', 92)
        + '<h3>Say hello privately</h3>'
        + '<p>End-to-end encrypted thread. Messages sync directly across devices with zero spam or bots.</p>'
        + '</div>';
    }

    var qFilter = (LV.chatSearchQ || '').trim().toLowerCase();
    var html = '<div class="sys">' + I('lock', 12) + ' End-to-end encrypted · Verified on device</div>';
    var lastDay = '';
    var lastSender = '';

    msgs.forEach(function (m) {
      var day = m.ts ? new Date(m.ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';
      if (day && day !== lastDay) {
        html += '<div class="sys g">' + E(day) + '</div>';
        lastDay = day;
        lastSender = '';
      }
      if (m.kind === 'system') {
        html += '<div class="sys g">' + E(m.text) + '</div>';
        lastSender = '';
        return;
      }
      if (qFilter && (!m.text || m.text.toLowerCase().indexOf(qFilter) === -1)) return;

      var isMe = m.from === myUid;
      var grouped = lastSender === m.from;
      lastSender = m.from;
      var tick = Engine.computeTick(m);
      var tickHtml = '';
      if (isMe) {
        if (tick === 0) tickHtml = '<span class="tk">' + I('clock', 11) + '</span>';
        else if (tick === 1) tickHtml = '<span class="tk">&#10003;</span>';
        else if (tick === 2) tickHtml = '<span class="tk">&#10003;&#10003;</span>';
        else tickHtml = '<span class="tk r">&#10003;&#10003;</span>';
      }

      var vanishTag = '';
      if (m.expAt && m.expAt > 0) {
        var remSec = Math.max(0, Math.ceil((m.expAt - Date.now()) / 1000));
        vanishTag = '<span style="margin-right:6px;opacity:.85">' + I('timer', 10) + ' ' + remSec + 's</span>';
      } else if (m.timerMode === 'burn') {
        vanishTag = '<span style="margin-right:6px;opacity:.85">' + I('flame', 10) + ' Burn</span>';
      }

      var starredTag = LV.settings.starredIds[m.id] ? ' ' + I('star', 10) : '';
      var senderHeader = (!isMe && chat.kind === 'group' && !grouped)
        ? '<div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:2px">' + E(m.fromName || 'Member') + '</div>'
        : '';
      var replyHtml = m.replyTo
        ? '<div class="rq"><b>' + E(m.replyTo.fromName || 'Message') + '</b><div>' + E((m.replyTo.text || '').slice(0, 72)) + '</div></div>'
        : '';

      var body = '';
      if (m.deleted || m.kind === 'deleted') {
        body = '<span style="opacity:.6;font-style:italic">' + I('block', 12) + ' This message was deleted</span>';
      } else if (m.kind === 'sticker' && m.stickerUrl) {
        body = '<img class="msg-sticker" src="' + E(m.stickerUrl) + '" alt="Sticker"/>';
      } else if (m.kind === 'photo' && m.imgData) {
        var openedOnce = m.viewOnce && !isMe && m.openedBy && m.openedBy[myUid];
        if (openedOnce) {
          body = '<div style="display:flex;align-items:center;gap:6px;opacity:.7">' + I('eyeOff', 15) + ' View-once photo opened</div>';
        } else if (m.viewOnce && !isMe) {
          body = '<button data-act="openphoto" data-id="' + E(m.id) + '" style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-weight:600">'
            + ico('eye', 'lime', 16) + '<span>Tap to view once photo</span></button>';
        } else {
          body = '<div class="ph1" data-act="openphoto" data-id="' + E(m.id) + '"><img src="' + E(m.imgData) + '" alt="Shared photo"/></div>'
            + (m.text ? '<div style="margin-top:6px">' + E(m.text) + '</div>' : '');
        }
      } else if (m.kind === 'voice') {
        var bars = [10, 18, 24, 14, 22, 16, 26, 12, 20, 15, 22, 11];
        body = '<div class="vb" data-act="playvoice" data-id="' + E(m.id) + '">'
          + '<span class="pl">' + I('play', 14) + '</span>'
          + '<div style="display:flex;align-items:center;gap:3px;height:26px">'
          + bars.map(function (h) { return '<i style="height:' + h + 'px"></i>'; }).join('')
          + '</div>'
          + '<span style="font-size:11px;margin-left:4px">' + fmtDur(m.audioSec || 3) + '</span>'
          + '</div>';
      } else if (m.kind === 'poll' && m.poll) {
        var votes = m.poll.votes || {};
        var totalVotes = Object.keys(votes).length;
        var myVote = votes[myUid];
        body = '<div style="min-width:210px"><b>' + I('poll', 14) + ' ' + E(m.poll.q) + '</b>'
          + (m.poll.opts || []).map(function (opt, idx) {
            var cnt = Object.keys(votes).filter(function (u) { return votes[u] === idx; }).length;
            var pct = totalVotes ? Math.round((cnt / totalVotes) * 100) : 0;
            var mine = myVote === idx;
            return '<button class="pollb ' + (pct > 0 ? 'voted' : '') + '" data-act="vote" data-mid="' + E(m.id) + '" data-v="' + idx + '">'
              + '<i style="width:' + pct + '%"></i>'
              + '<span><span>' + (mine ? I('check', 13) + ' ' : '') + E(opt) + '</span><b>' + cnt + '</b></span></button>';
          }).join('')
          + '<div style="font-size:10px;opacity:.7;margin-top:2px">' + totalVotes + ' vote' + (totalVotes === 1 ? '' : 's') + '</div></div>';
      } else if (m.kind === 'loc' && m.loc) {
        body = '<div style="display:grid;gap:4px"><b>' + I('location', 14) + ' ' + E(m.loc.label || 'Shared location') + '</b>'
          + '<span style="font-size:11px;opacity:.75">' + E(m.loc.approx || 'Approximate area (+/- 500m)') + '</span></div>';
      } else if (m.kind === 'contact' && m.contact) {
        body = '<div style="display:flex;align-items:center;gap:10px">'
          + av(m.contact.handle, 34, m.contact.avatar)
          + '<div><b>' + E(m.contact.name) + '</b><div style="font-size:11px;opacity:.75">' + E(m.contact.handle) + '</div></div>'
          + '<button class="pill on" data-act="lookupandchat" data-h="' + E(m.contact.handle) + '">Chat</button>'
          + '</div>';
      } else if (m.kind === 'doc' && m.doc) {
        body = '<button data-act="opendoc" data-id="' + E(m.id) + '" style="display:flex;align-items:center;gap:10px">'
          + ico('file', 'lime', 18) + '<div><b>' + E(m.doc.name) + '</b><div style="font-size:11px;opacity:.75">' + E(m.doc.size || 'Document') + '</div></div></button>';
      } else {
        body = E(m.text || '');
      }

      var reactEntries = m.reactions ? Object.keys(m.reactions).map(function (u) { return m.reactions[u]; }).filter(Boolean) : [];
      var reactHtml = reactEntries.length
        ? '<div style="display:inline-flex;gap:4px;background:#fff;color:#0a2230;border-radius:12px;padding:2px 7px;font-size:12px;margin-top:-6px;box-shadow:0 2px 6px rgba(0,0,0,.12)">' + reactEntries.join('') + '</div>'
        : '';

      if (m.kind === 'sticker') {
        html += '<div class="mr ' + (isMe ? 'me ' : '') + (grouped ? 'g' : '') + '">'
          + '<div data-act="msel" data-id="' + E(m.id) + '" style="display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start') + '">'
          + body + '<small style="font-size:10px;color:var(--mute);margin-top:2px">' + vanishTag + fmtTime(m.ts) + ' ' + tickHtml + '</small>'
          + reactHtml + '</div></div>';
      } else {
        html += '<div class="mr ' + (isMe ? 'me ' : '') + (grouped ? 'g' : '') + '">'
          + '<div class="b ' + (isMe ? 'me ' : '') + (grouped ? '' : 'tail') + '" data-act="msel" data-id="' + E(m.id) + '">'
          + senderHeader + replyHtml + body
          + '<small>' + vanishTag + starredTag + fmtTime(m.ts) + ' ' + tickHtml + '</small>'
          + '</div></div>'
          + (reactHtml ? '<div class="mr ' + (isMe ? 'me' : '') + '" style="margin-top:-4px">' + reactHtml + '</div>' : '');
      }
    });

    if (peerTyping) {
      html += '<div class="mr"><div class="tp"><i></i><i></i><i></i></div></div>';
    }
    return html;
  }

  function renderComposer(chat, isDesktop) {
    var html = '';
    if (LV.replyTo) {
      html += '<div class="rbar"><div style="flex:1;min-width:0"><b>Replying to ' + E(LV.replyTo.fromName || 'Message') + '</b>'
        + '<div style="color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + E(LV.replyTo.text || LV.replyTo.kind) + '</div></div>'
        + '<button data-act="cancelreply">' + I('close', 16) + '</button></div>';
    }
    var timerObj = global.JCA.TIMERS.find(function (t) { return t.id === (chat.timer || 'off'); });
    var timerLabel = (timerObj && timerObj.id !== 'off') ? timerObj.label : 'Vanish off';
    html += '<div class="opt">'
      + '<button class="pill ' + (chat.timer && chat.timer !== 'off' ? 'on' : '') + '" data-act="opentimer">' + I('timer', 13) + ' ' + E(timerLabel) + '</button>'
      + '<button class="pill" data-act="openstickers">' + I('sparkles', 13) + ' Stickers</button>'
      + '<button class="pill" data-act="openpoll">' + I('poll', 13) + ' Poll</button>'
      + '<button class="pill" data-go="' + (isDesktop ? '' : 'ai-summary') + '" data-act="' + (isDesktop ? 'aisum' : '') + '">' + I('bot', 13) + ' Summary</button>'
      + '</div>';

    var val = global.JCHATT_DRAFT || '';
    html += '<div class="comp">'
      + '<button class="pl" title="Attach" data-act="openattach">' + I('plus', 20) + '</button>'
      + '<div class="inw">'
      + '<button title="Stickers" data-act="openstickers">' + I('smile', 19) + '</button>'
      + '<input id="chat-input" type="text" autocomplete="off" placeholder="Message quietly..." value="' + E(val) + '"/>'
      + '<button title="Photo" data-act="pickphoto">' + I('cam', 19) + '</button>'
      + '</div>'
      + '<button id="send-btn" class="snd ' + (val.trim() ? 'lime' : '') + '" data-act="send" title="Send or Record">'
      + I(val.trim() ? 'send' : 'mic', 20)
      + '</button></div>';
    return html;
  }

  // --- Screen Registry ---
  var SCREENS = {
    'splash': function () {
      return '<div class="scr center" style="background:var(--ink);color:#fff">'
        + global.JCA.mascot('happy', 112)
        + '<div class="wordmark">jchatt</div>'
        + '<p class="mute">Private by architecture</p>'
        + '<div class="load"><i></i></div></div>';
    },

    'welcome-1': function () {
      return '<div class="scr ob">'
        + '<div style="display:flex;justify-content:flex-end"><button style="color:var(--mute);font-weight:700" data-go="restore-account">Sign in</button></div>'
        + '<div class="ill">' + global.JCA.ILL.lock + '</div>'
        + '<div class="dots"><i class="on"></i><i></i><i></i></div>'
        + '<h2>Encrypted end-to-end across phones</h2>'
        + '<p>Every chat, photo, voice note and call leaves your device sealed. No spam, no ads, zero telemetry.</p>'
        + '<div style="display:grid;gap:8px">'
        + btn('Next', '', 'data-go="welcome-2"')
        + btn('I already have a private ID', 'ghost', 'data-go="restore-account"')
        + '</div>'
        + '<div style="font-size:11px;color:var(--mute);text-align:center;margin-top:14px;line-height:1.5">'
        + 'By continuing you accept the <button data-act="openlegal" data-v="terms" style="background:none;border:none;color:var(--ink);font-weight:700;text-decoration:underline;padding:0;cursor:pointer">Terms</button> & <button data-act="openlegal" data-v="privacy" style="background:none;border:none;color:var(--ink);font-weight:700;text-decoration:underline;padding:0;cursor:pointer">Privacy Policy</button>.'
        + '</div></div>';
    },

    'welcome-2': function () {
      return '<div class="scr ob">'
        + '<div style="display:flex;justify-content:space-between"><button style="color:var(--mute)" data-back="1">Back</button><button style="color:var(--mute);font-weight:700" data-go="restore-account">Sign in</button></div>'
        + '<div class="ill">' + global.JCA.ILL.vanish + '</div>'
        + '<div class="dots"><i></i><i class="on"></i><i></i></div>'
        + '<h2>Disappear on your schedule</h2>'
        + '<p>Arm 10-second vanishing timers, burn-after-reading bubbles, or view-once photos per conversation.</p>'
        + '<div style="display:grid;gap:8px">'
        + btn('Next', '', 'data-go="welcome-3"')
        + '</div></div>';
    },

    'welcome-3': function () {
      return '<div class="scr ob">'
        + '<div style="display:flex;justify-content:space-between"><button style="color:var(--mute)" data-back="1">Back</button><span></span></div>'
        + '<div class="ill">' + global.JCA.ILL.masks + '</div>'
        + '<div class="dots"><i></i><i></i><i class="on"></i></div>'
        + '<h2>No phone number required</h2>'
        + '<p>Claim a private @handle, disguise JChatt as a calculator with one tap, and set a Duress PIN.</p>'
        + '<div style="display:grid;gap:8px">'
        + btn('Create my private ID', '', 'data-go="create-id"')
        + btn('Restore existing ID or link device', 'ink', 'data-go="restore-account"')
        + '</div></div>';
    },

    'create-id': function () {
      var d = LV.draftCreate;
      var suggest = d.handle || global.JCA.randomHandle();
      if (!d.handle) d.handle = suggest;
      var invBanner = LV.pendingInvitePreview
        ? '<div class="card" style="background:#e2f4d0;color:#0a2230;margin:0 0 14px"><b>Invite ready from ' + E(LV.pendingInvitePreview.name || LV.pendingInvitePreview.handle) + '</b><p style="font-size:12px">Finish creating your ID and your chat will open immediately.</p></div>'
        : '';
      return '<div class="scr">'
        + hdr('Create your private ID', 'No phone or email required', backBtn('welcome-3'), '')
        + '<div class="body pad nonav">'
        + invBanner
        + '<div style="display:grid;place-items:center;margin-bottom:14px">' + av(d.handle, 72) + '</div>'
        + '<div class="sec" style="padding-left:0">Private Handle</div>'
        + '<div class="inw" style="margin-bottom:10px">'
        + '<input id="cid-handle" type="text" value="' + E(d.handle) + '" placeholder="@your.private.id"/>'
        + '<button title="Randomize" data-act="randhandle">' + I('refresh', 18) + '</button>'
        + '</div>'
        + '<div class="sec" style="padding-left:0">Display Name</div>'
        + '<div class="inw" style="margin-bottom:12px">'
        + '<input id="cid-name" type="text" value="' + E(d.name) + '" placeholder="Optional friendly name"/>'
        + '</div>'
        + '<div class="sec" style="padding-left:0">Starting Mask</div>'
        + '<div style="display:flex;gap:8px;margin-bottom:14px">'
        + ['Personal', 'Work', 'Ghost'].map(function (mk) {
          return '<button class="pill ' + (d.mask === mk ? 'on' : '') + '" data-act="pickmask" data-v="' + mk + '">' + mk + '</button>';
        }).join('')
        + '</div>'
        + (d.error ? '<div class="err-inline" style="margin-bottom:10px">' + E(d.error) + '</div>' : '')
        + btn(d.busy ? 'Creating encrypted identity...' : 'Continue', '', 'data-act="signup"')
        + '<div style="margin-top:10px">' + btn('Already have an ID or link code?', 'ghost', 'data-go="restore-account"') + '</div>'
        + '</div></div>';
    },

    'restore-account': function () {
      var r = LV.draftRestore;
      return '<div class="scr">'
        + hdr('Restore or Link', 'Zero-knowledge device handoff', backBtn('welcome-1'), '')
        + '<div class="body pad nonav">'
        + '<div style="display:flex;gap:8px;margin-bottom:14px">'
        + '<button class="pill ' + (r.tab === 'phrase' ? 'on' : '') + '" data-act="rtab" data-v="phrase">12-Word Phrase</button>'
        + '<button class="pill ' + (r.tab === 'code' ? 'on' : '') + '" data-act="rtab" data-v="code">Device Link Code</button>'
        + '</div>'
        + (r.tab === 'phrase'
          ? '<div class="sec" style="padding-left:0">Your Private ID</div>'
            + '<div class="inw" style="margin-bottom:10px"><input id="res-handle" type="text" value="' + E(r.handle) + '" placeholder="@your.private.id"/></div>'
            + '<div class="sec" style="padding-left:0">12-Word Recovery Phrase</div>'
            + '<textarea id="res-phrase" rows="3" style="width:100%;border-radius:16px;padding:12px;border:1px solid var(--line);font:inherit;background:#fff;color:var(--text)" placeholder="Enter all 12 words separated by spaces...">' + E(r.phrase) + '</textarea>'
          : '<div class="sec" style="padding-left:0">One-Time Device Code</div>'
            + '<div class="inw" style="margin-bottom:10px"><input id="res-code" type="text" value="' + E(r.code) + '" placeholder="ABCD-EF23" style="text-transform:uppercase;letter-spacing:.12em;font-weight:700"/></div>'
            + '<p style="font-size:12px;color:var(--mute)">Open JChatt on your other phone or browser -> Shield -> Linked Devices -> Link a device.</p>'
        )
        + (r.error ? '<div class="err-inline" style="margin:10px 0">' + E(r.error) + '</div>' : '')
        + '<div style="margin-top:16px">' + btn(r.busy ? 'Verifying with Firebase...' : (r.tab === 'phrase' ? 'Restore my account' : 'Link this device'), '', 'data-act="dorestore"') + '</div>'
        + '<div style="margin-top:8px">' + btn('Create a brand new ID', 'ghost', 'data-go="create-id"') + '</div>'
        + '</div></div>';
    },

    'secure-device': function () {
      var s = LV.settings;
      return '<div class="scr">'
        + hdr('Lock it down', 'Protect this device', backBtn('create-id'), '<button style="color:var(--lime);font-weight:700" data-go="recovery-phrase">Skip</button>')
        + '<div class="body pad nonav">'
        + '<div class="card">' + togRow('fingerprint', 'lime', 'Fingerprint / Face Unlock', 'Touch fingerprint sensor to open', s.biometric, 'biometric') + togRow('lock', 'lime', 'App Lock PIN', 'Ask for 4-digit PIN on open', s.appLock, 'appLock') + '</div>'
        + '<div class="sec" style="padding-left:0">Real Unlock PIN (4 digits)</div>'
        + '<div class="inw" style="margin-bottom:12px"><input id="sec-pin" type="password" maxlength="4" inputmode="numeric" value="' + E(s.lockPin || '') + '" placeholder="Leave blank or set 4 digits (e.g. 2468)"/></div>'
        + '<div class="sec" style="padding-left:0">Duress Decoy PIN (optional)</div>'
        + '<div class="inw" style="margin-bottom:8px"><input id="sec-dpin" type="password" maxlength="4" inputmode="numeric" value="' + E(s.duressPin || '') + '" placeholder="Opens harmless decoy inbox (e.g. 9999)"/></div>'
        + '<p style="font-size:12px;color:var(--mute);margin-bottom:16px">If anyone forces you to unlock JChatt, entering your Duress PIN opens a separate, ordinary inbox while keeping your real chats invisible.</p>'
        + btn('Save & see recovery phrase', '', 'data-act="savepins"')
        + '</div></div>';
    },

    'recovery-phrase': function () {
      var words = (LV.settings.phrase && LV.settings.phrase.length) ? LV.settings.phrase : global.JCA.generatePhrase();
      LV.settings.phrase = words;
      return '<div class="scr">'
        + hdr('Recovery phrase', 'Your only key to restore @ID', backBtn('secure-device'), '')
        + '<div class="body pad nonav">'
        + '<p style="font-size:13px;color:var(--mute);margin-bottom:12px">Write these 12 words down offline. JChatt has no password reset email — these words + your @ID restore your account on any phone worldwide.</p>'
        + '<div class="sn" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'
        + words.map(function (w, i) { return '<div style="background:#fff;color:var(--ink);padding:7px;border-radius:10px;font-weight:700"><span style="opacity:.45;margin-right:4px">' + (i + 1) + '.</span>' + E(w) + '</div>'; }).join('')
        + '</div>'
        + '<div style="display:grid;gap:8px">'
        + btn(I('copy', 17) + ' Copy phrase safely', 'ink', 'data-act="copyphrase"')
        + btn('I wrote it down -> Continue', '', 'data-act="backedup"')
        + '</div></div></div>';
    },

    'permissions': function () {
      return '<div class="scr">'
        + hdr('Almost ready', 'Optional permissions', backBtn('recovery-phrase'), '')
        + '<div class="body pad nonav">'
        + '<div class="card">'
        + row(ico('bell', 'lime'), 'Message notifications', 'Show disguised preview on incoming messages', '', 'data-act="reqnotif"')
        + row(ico('mic', 'ink'), 'Microphone & camera', 'Only used during voice notes, calls & QR scans', '', 'data-act="reqmedia"')
        + '</div>'
        + btn('Finish setup', '', 'data-go="account-ready"')
        + '</div></div>';
    },

    'account-ready': function () {
      var me = global.JFE.me || {};
      return '<div class="scr ob" style="justify-content:center;gap:14px">'
        + '<div style="display:grid;place-items:center">' + global.JCA.ILL.verified + '</div>'
        + '<h2>You are live on JChatt</h2>'
        + '<p style="margin:0">Your private handle is <b>' + E(me.handle || '@user') + '</b>. Zero demo contacts — share your link or search any friend by @ID.</p>'
        + btn('Open my inbox', '', 'data-act="enterapp"')
        + '</div>';
    },

    // --- Tab 1: Chats ---
    'chats': function () {
      var Engine = global.JFE;
      var me = Engine.me || {};
      var allChats = sortedChats(false);
      var archCount = Object.keys(Engine.chats || {}).filter(function (k) { return Engine.chats[k].archived; }).length;
      var list = allChats.filter(function (c) {
        if (LV.filter === 'unread') return (c.unread || 0) > 0;
        if (LV.filter === 'groups') return c.kind === 'group';
        return true;
      });
      var pinned = list.filter(function (c) { return c.pinned; });
      var normal = list.filter(function (c) { return !c.pinned; });

      function chatRowHtml(c) {
        var isMeLast = c.lastFrom && c.lastFrom === Engine.uid;
        var pres = c.peerUid && Engine.peerPresence[c.peerUid];
        var online = !!(pres && pres.online);
        var badge = c.unread > 0
          ? (c.muted ? '<span class="tag">' + I('bellOff', 11) + ' ' + c.unread + '</span>' : '<span class="badge">' + c.unread + '</span>')
          : (c.muted ? I('bellOff', 13) : '');
        var subPrefix = isMeLast ? '<span class="tk">&#10003;&#10003;</span>' : '';
        return row(
          av(c.name || c.handle || c.id, 48, c.avatar, online),
          E(c.name || c.handle || 'Conversation'),
          subPrefix + E(c.lastText || (c.kind === 'group' ? 'Group created' : 'Encrypted chat ready')),
          (c.lastTs ? fmtTime(c.lastTs) + ' ' : '') + badge,
          'data-act="open" data-id="' + E(c.id) + '"'
        );
      }

      var bodyInner = '';
      if (!allChats.length && !archCount) {
        bodyInner = emptyP(
          'chats',
          'Quiet in here',
          'Your inbox starts 100% clean. Add a friend by @private-id, scan their QR, or share an invite link.',
          btn(I('userPlus', 17) + ' Add contact by @ID', '', 'data-go="add-contact"')
          + btn(I('share', 17) + ' Share one-time invite', 'ink', 'data-go="invite"')
        );
      } else {
        if (archCount) {
          bodyInner += row(ico('archive', 'ink'), 'Archived chats', archCount + ' hidden thread' + (archCount > 1 ? 's' : ''), '', 'data-go="archive"');
        }
        if (pinned.length) {
          bodyInner += '<div class="sec">Pinned</div>' + pinned.map(chatRowHtml).join('');
        }
        if (normal.length) {
          if (pinned.length) bodyInner += '<div class="sec">Recent</div>';
          bodyInner += normal.map(chatRowHtml).join('');
        } else if (!pinned.length) {
          bodyInner += emptyP('filter', 'No matches', 'No conversations match the current filter.', btn('Show all chats', 'ghost', 'data-act="filt" data-v="all"'));
        }
      }

      var statusBanner = Engine.connected
        ? ''
        : '<div class="banner"><span class="spin"></span><span>Connecting to JChatt cloud...</span></div>';

      return '<div class="scr">'
        + hdr(
          '<span style="font-size:26px;font-weight:800;letter-spacing:-.04em">jchatt</span>',
          me.handle || '',
          '',
          rb('search', 'data-go="search"') + ' ' + rb('qr', 'data-go="qr"')
        )
        + statusBanner
        + '<div class="chips">'
        + chip('all', 'All', LV.filter === 'all')
        + chip('unread', 'Unread', LV.filter === 'unread')
        + chip('groups', 'Groups', LV.filter === 'groups')
        + '<button class="chip" data-go="folders">' + I('folder', 13) + '</button>'
        + '</div>'
        + '<div class="body">' + bodyInner + '</div>'
        + '<button class="fab" data-go="new-chat" title="New chat">' + I('edit', 22) + '</button>'
        + navBar('chats')
        + '</div>';
    },

    'chats-empty': function () { return SCREENS['chats'](); },

    // --- Tab 2: Updates (Statuses & Channels) ---
    'updates': function () {
      var Engine = global.JFE;
      var me = Engine.me || {};
      var statuses = Engine.getVisibleStatuses();
      var mine = statuses.filter(function (s) { return s.uid === Engine.uid; });
      var others = statuses.filter(function (s) { return s.uid !== Engine.uid; });

      var body = '<div class="sec">My status</div>'
        + row(
          '<span class="ring ' + (mine.length ? '' : 'd') + '">' + av(me.handle || 'me', 46, me.avatar) + '</span>',
          'My Status',
          mine.length ? E(mine[0].text || 'Photo update') + ' · ' + fmtTime(mine[0].ts) : 'Tap to post an encrypted 24h update',
          '',
          'data-go="' + (mine.length ? 'status-view' : 'status-compose') + '"' + (mine.length ? ' data-sid="' + E(mine[0].id) + '"' : '')
        )
        + '<div style="padding:4px 16px 8px;display:flex;gap:8px">'
        + btn(I('plus', 16) + ' New status', '', 'data-go="status-compose"')
        + '</div>'
        + '<div class="sec">Contacts (24h encrypted)</div>';

      if (!others.length) {
        body += emptyP('updates', 'No contact updates yet', 'Statuses from people in your encrypted inbox appear here automatically.', '');
      } else {
        body += others.map(function (st) {
          var viewed = st.viewers && st.viewers[Engine.uid];
          return row(
            '<span class="ring ' + (viewed ? 'd' : '') + '">' + av(st.name || st.handle, 46, st.avatar) + '</span>',
            E(st.name || st.handle),
            E(st.text || 'Photo update'),
            fmtTime(st.ts),
            'data-act="viewst" data-id="' + E(st.id) + '"'
          );
        }).join('');
      }

      return '<div class="scr">'
        + hdr('<span class="ttl big">Updates</span>', '', '', rb('plus', 'data-go="status-compose"'))
        + '<div class="body">' + body + '</div>'
        + navBar('updates')
        + '</div>';
    },

    // --- Tab 3: Calls ---
    'calls': function () {
      var Engine = global.JFE;
      var logs = Object.keys(Engine.callLogs || {}).map(function (k) { return Engine.callLogs[k]; })
        .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      var body = '';
      if (!logs.length) {
        body = emptyP(
          'calls',
          'No recent calls',
          'End-to-end WebRTC voice and video calls with any contact will appear here.',
          btn('Start a call', '', 'data-go="new-chat"')
        );
      } else {
        body = logs.map(function (c) {
          var sub = (c.dir === 'out' ? 'Outgoing' : (c.missed ? 'Missed' : 'Incoming'))
            + (c.durSec ? ' · ' + fmtDur(c.durSec) : '')
            + ' · ' + fmtTime(c.ts);
          return row(
            av(c.name || c.handle, 46, c.avatar),
            '<span style="' + (c.missed ? 'color:var(--orange)' : '') + '">' + E(c.name || c.handle) + '</span>',
            sub,
            I(c.video ? 'video' : 'calls', 18),
            'data-act="callto" data-uid="' + E(c.peerUid) + '" data-v="' + (c.video ? '1' : '0') + '"'
          );
        }).join('');
      }
      return '<div class="scr">'
        + hdr('<span class="ttl big">Calls</span>', '', '', rb('plus', 'data-go="new-chat"'))
        + '<div class="body">' + body + '</div>'
        + navBar('calls')
        + '</div>';
    },

    // --- Tab 4: Shield ---
    'shield': function () {
      var s = LV.settings;
      var score = shieldScore();
      var disObj = global.JCA.DIS.find(function (d) { return d.id === s.disguise; }) || global.JCA.DIS[0];
      var nextTip = !s.phraseBackedUp
        ? { t: 'Confirm your 12-word recovery backup', g: 'recovery-phrase' }
        : (!s.appLock ? { t: 'Enable 4-digit App Lock PIN', g: 'secure-device' }
          : (s.disguise === 'default' ? { t: 'Try stealth Calculator disguise', g: 'disguise' }
            : { t: 'Review linked devices & active sessions', g: 'devices' }));

      return '<div class="scr">'
        + hdr('<span class="ttl big">Shield</span>', 'On-device privacy status', '', rb('settings', 'data-go="privacy-settings"'))
        + '<div class="body pad">'
        + '<div class="card" style="margin:0 0 12px;display:flex;align-items:center;gap:14px">'
        + '<div class="ringc" style="--p:' + score + '"><div><b>' + score + '</b><small>/ 100</small></div></div>'
        + '<div style="flex:1;min-width:0"><b>' + (score >= 85 ? 'Hardened' : 'Good protection') + '</b>'
        + '<p style="font-size:12px;color:var(--mute);margin:4px 0 8px">' + E(nextTip.t) + '</p>'
        + '<button class="pill on" data-go="' + nextTip.g + '">Review -></button>'
        + '</div></div>'
        + '<div class="gr2" style="padding:0;margin-bottom:12px">'
        + '<button style="background:#e2f4d0" data-go="vault-lock">' + ico('lock', 'ink') + '<b>Hidden Vault</b><span style="font-size:11px;color:var(--mute)">Separate PIN space</span></button>'
        + '<button style="background:#dbeeff" data-go="masks">' + ico('mask', 'ink') + '<b>Identity Masks</b><span style="font-size:11px;color:var(--mute)">Switch display persona</span></button>'
        + '<button style="background:#ffe3d3" data-go="disguise">' + ico(disObj.ic, 'org') + '<b>App Disguise</b><span style="font-size:11px;color:var(--mute)">' + E(disObj.name) + '</span></button>'
        + '<button style="background:#e7e9ff" data-go="devices">' + ico('laptop', 'ink') + '<b>Linked Devices</b><span style="font-size:11px;color:var(--mute)">Link Web & Phone</span></button>'
        + '</div>'
        + '<div class="card" style="margin:0">'
        + row(ico('key', 'lime'), 'Recovery phrase & keys', s.phraseBackedUp ? 'Verified offline' : 'Backup recommended', I('next', 16), 'data-go="recovery-phrase"')
        + row(ico('shield', 'ink'), 'Privacy & anti-screenshot', 'Relay calls, read receipts', I('next', 16), 'data-go="privacy-settings"')
        + row(ico('globe', 'ink'), 'Network & onion relay', s.onionRoute ? 'Relay armed' : 'Direct P2P / Firebase', I('next', 16), 'data-go="network"')
        + '</div></div>'
        + navBar('shield')
        + '</div>';
    },

    // --- Tab 5: You / Settings ---
    'settings': function () {
      var me = global.JFE.me || {};
      var s = LV.settings;
      return '<div class="scr">'
        + hdr('<span class="ttl big">You</span>', me.handle || '', '', rb('qr', 'data-go="my-qr"'))
        + '<div class="body pad">'
        + '<div class="card" style="margin:0 0 12px">'
        + row(av(me.handle || 'me', 54, me.avatar, true), E(me.name || me.handle || 'Account'), E(me.bio || 'Available on JChatt') + ' · ' + E(me.handle || ''), I('edit', 17), 'data-go="profile-edit"')
        + '</div>'
        + '<div class="gr2" style="padding:0;margin-bottom:12px">'
        + '<button style="background:#fff" data-go="appearance">' + ico('palette', 'lime') + '<b>Appearance</b><span style="font-size:11px;color:var(--mute)">' + (s.darkMode ? 'Dark' : 'Light') + ' · ' + E(s.theme) + '</span></button>'
        + '<button style="background:#fff" data-go="privacy-settings">' + ico('lock', 'ink') + '<b>Privacy</b><span style="font-size:11px;color:var(--mute)">Locks & receipts</span></button>'
        + '<button style="background:#fff" data-go="notifications">' + ico('bell', 'ink') + '<b>Notifications</b><span style="font-size:11px;color:var(--mute)">Disguised alerts</span></button>'
        + '<button style="background:#fff" data-go="storage">' + ico('cloud', 'ink') + '<b>Storage & Backup</b><span style="font-size:11px;color:var(--mute)">Media & JSON export</span></button>'
        + '<button style="background:#fff" data-go="wallet">' + ico('wallet', 'lime') + '<b>Wallet</b><span style="font-size:11px;color:var(--mute)">Local demo vault</span></button>'
        + '<button style="background:#fff" data-go="explore">' + ico('compass', 'org') + '<b>36+ Mini-Apps</b><span style="font-size:11px;color:var(--mute)">Spaces, tools & AI</span></button>'
        + '</div>'
        + '<div class="card" style="margin:0">'
        + row(ico('share', 'ink'), 'Invite a friend', 'Generate a one-time link or QR', I('next', 16), 'data-go="invite"')
        + row(ico('help', 'ink'), 'Help & About JChatt', 'Support, changelog & audit info', I('next', 16), 'data-go="settings-more"')
        + row(ico('logout', 'org'), 'Sign out or lock', 'Return to welcome or lock screen', I('next', 16), 'data-go="logout-confirm"')
        + '</div></div>'
        + navBar('settings')
        + '</div>';
    },

    // --- Active Conversation (1:1 & Group) ---
    'chat': function () { return renderChatScreen(false); },
    'chat-group': function () { return renderChatScreen(true); },

    // --- Sheets & Modals over Chat ---
    'attach-sheet': function () {
      return SCREENS['chat']() + sheet('Attach securely',
        '<div class="grid3">'
        + '<button data-act="pickphoto">' + ico('photo', 'lime') + '<span>Photo</span></button>'
        + '<button data-act="pickviewonce">' + ico('eye', 'org') + '<span>View-Once Photo</span></button>'
        + '<button data-go="voice-record">' + ico('mic', 'ink') + '<span>Voice Note</span></button>'
        + '<button data-go="poll-create">' + ico('poll', 'lime') + '<span>Live Poll</span></button>'
        + '<button data-act="sendloc">' + ico('location', 'ink') + '<span>Approx. Location</span></button>'
        + '<button data-go="contact-share">' + ico('user', 'ink') + '<span>Contact Card</span></button>'
        + '<button data-act="pickdoc">' + ico('file', 'ink') + '<span>Document</span></button>'
        + '<button data-go="stickers">' + ico('sparkles', 'lime') + '<span>Stickers</span></button>'
        + '<button data-go="timer-sheet">' + ico('timer', 'org') + '<span>Vanish Timer</span></button>'
        + '</div>', 'chat');
    },

    'timer-sheet': function () {
      var chat = global.JFE.chats[LV.curChatId] || {};
      return SCREENS['chat']() + sheet('Disappearing messages',
        global.JCA.TIMERS.map(function (t) {
          var on = (chat.timer || 'off') === t.id;
          return row(ico(t.id === 'burn' ? 'flame' : 'timer', on ? 'lime' : ''), E(t.label), E(t.sub), on ? I('check', 17) : '', 'data-act="settimer" data-v="' + t.id + '"');
        }).join(''), 'chat');
    },

    'stickers': function () {
      var items = global.JCA.ASSETS.stickers.map(function (st) {
        return '<button style="padding:8px;border-radius:14px;background:var(--in);display:grid;place-items:center;gap:4px" data-act="sendsticker" data-url="' + E(st.url) + '">'
          + '<img src="' + E(st.url) + '" width="68" height="68" style="object-fit:contain"/>'
          + '<span style="font-size:10px;color:var(--mute)">' + E(st.label) + '</span></button>';
      }).join('');
      return SCREENS['chat']() + sheet('Mascot Stickers', '<div class="grid3">' + items + '</div>', 'chat');
    },

    'voice-record': function () {
      return SCREENS['chat']() + sheet('Voice message',
        '<div style="display:grid;place-items:center;gap:12px;padding:12px 0">'
        + ico('mic', LV.voiceRecording ? 'org' : 'lime', 28)
        + '<div style="font-size:28px;font-weight:800">' + fmtDur(LV.voiceSeconds) + '</div>'
        + '<p style="font-size:12px;color:var(--mute)">' + (LV.voiceRecording ? 'Recording encrypted audio...' : 'Tap Start to record a real voice note.') + '</p>'
        + (LV.voiceRecording
          ? btn(I('send', 17) + ' Stop & Send Voice Note', '', 'data-act="voicestopsend"')
          : btn(I('mic', 17) + ' Start Recording', 'ink', 'data-act="voicestart"'))
        + '</div>', 'chat');
    },

    'photo-view': function () {
      var m = LV.viewingPhoto || {};
      return '<div class="scr" style="background:#000;color:#fff">'
        + hdr('Photo', m.viewOnce ? 'View-once protected' : fmtTime(m.ts), backBtn('chat'), '')
        + '<div style="flex:1;display:grid;place-items:center;padding:16px;min-height:0">'
        + (m.imgData ? '<img src="' + E(m.imgData) + '" style="max-width:100%;max-height:100%;border-radius:16px;object-fit:contain"/>' : '<p>No image</p>')
        + '</div></div>';
    },

    'msg-actions': function () {
      var msg = ((global.JFE.messagesByChat[LV.curChatId] || {})[LV.selMsgId]) || {};
      var isMe = msg.from === global.JFE.uid;
      var emojis = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
      return SCREENS['chat']() + sheet('Message',
        '<div style="display:flex;justify-content:space-around;margin-bottom:14px">'
        + emojis.map(function (em) { return '<button style="font-size:24px;padding:6px" data-act="react" data-v="' + em + '">' + em + '</button>'; }).join('')
        + '</div>'
        + row(ico('reply', 'lime'), 'Reply', '', '', 'data-act="mreply"')
        + row(ico('forward', 'ink'), 'Forward to chat', '', '', 'data-act="mfwd"')
        + row(ico('star', 'ink'), LV.settings.starredIds[msg.id] ? 'Unstar message' : 'Star message', '', '', 'data-act="mstar"')
        + row(ico('copy', 'ink'), 'Copy text', '', '', 'data-act="mcopy"')
        + row(ico('info', 'ink'), 'Message info', 'Delivered & read receipts', '', 'data-go="message-info"')
        + (isMe && !msg.deleted ? row(ico('trash', 'org'), 'Delete for everyone', 'Remove from both devices', '', 'data-act="mdel" data-all="1"') : '')
        + row(ico('trash', 'org'), 'Delete for me', 'Hide on this device', '', 'data-act="mdel" data-all="0"'), 'chat');
    },

    'forward-picker': function () {
      var list = sortedChats(true);
      return '<div class="scr">'
        + hdr('Forward to', 'Select destination', backBtn('chat'), '')
        + '<div class="body nonav">'
        + (list.length ? list.map(function (c) {
          return row(av(c.name || c.handle, 42, c.avatar), E(c.name || c.handle), E(c.handle || 'Group'), I('send', 16), 'data-act="fwdto" data-id="' + E(c.id) + '"');
        }).join('') : emptyP('forward', 'No chats yet', 'Add a contact first to forward.', ''))
        + '</div></div>';
    },

    'poll-create': function () {
      var p = LV.draftPoll;
      return '<div class="scr">'
        + hdr('Create Live Poll', 'Synced instantly to chat', backBtn('chat'), '')
        + '<div class="body pad nonav">'
        + '<div class="sec" style="padding-left:0">Question</div>'
        + '<div class="inw" style="margin-bottom:12px"><input id="poll-q" type="text" value="' + E(p.q) + '" placeholder="Ask the chat..."/></div>'
        + '<div class="sec" style="padding-left:0">Options</div>'
        + p.opts.map(function (o, idx) {
          return '<div class="inw" style="margin-bottom:8px"><input class="poll-opt" data-idx="' + idx + '" type="text" value="' + E(o) + '" placeholder="Option ' + (idx + 1) + '"/></div>';
        }).join('')
        + '<div style="margin-top:14px">' + btn('Send Poll to Chat', '', 'data-act="sendpoll"') + '</div>'
        + '</div></div>';
    },

    'chat-info': function () { return renderChatInfo(false); },
    'group-info': function () { return renderChatInfo(true); },

    'safety': function () {
      var chat = global.JFE.chats[LV.curChatId] || {};
      var nums = global.JCA.safetyNumbers(global.JFE.uid, chat.peerUid || chat.id);
      return '<div class="scr">'
        + hdr('Safety number', E(chat.name || 'Verification'), backBtn('chat-info'), '')
        + '<div class="body pad nonav">'
        + '<div class="qr" style="margin-bottom:14px">' + global.JCA.qrSvg('jchatt-verify:' + nums.join(''), 172) + '</div>'
        + '<p style="font-size:12px;color:var(--mute);text-align:center;margin-bottom:12px">Compare these 60 digits with ' + E(chat.name || 'your peer') + ' over voice or in person.</p>'
        + '<div class="sn" style="margin-bottom:14px">' + nums.map(function (g) { return '<span>' + g + '</span>'; }).join('') + '</div>'
        + btn('Mark as verified', '', 'data-act="toast" data-m="Safety number marked verified" data-go="chat-info"')
        + '</div></div>';
    },

    'chat-media': function () {
      var msgs = global.JFE.getChatMessages(LV.curChatId);
      var media = msgs.filter(function (m) { return m.kind === 'photo' && m.imgData; });
      return '<div class="scr">'
        + hdr('Shared Media', media.length + ' photos', backBtn('chat-info'), '')
        + '<div class="body nonav">'
        + (media.length ? '<div class="mg">' + media.map(function (m) { return '<div class="sq" data-act="openphoto" data-id="' + E(m.id) + '"><img src="' + E(m.imgData) + '"/></div>'; }).join('') + '</div>' : emptyP('photo', 'No shared media yet', 'Photos shared in this conversation will appear here.', ''))
        + '</div></div>';
    },

    'chat-search': function () {
      return '<div class="scr">'
        + hdr('Search chat', '', backBtn('chat'), '')
        + '<div class="body pad nonav">'
        + '<div class="inw" style="margin-bottom:12px">' + I('search', 18) + '<input id="chat-q" type="text" value="' + E(LV.chatSearchQ) + '" placeholder="Search messages in this thread..."/></div>'
        + btn('Filter thread', '', 'data-go="chat"')
        + '<div style="margin-top:8px">' + btn('Clear filter', 'ghost', 'data-act="clearchatsearch"') + '</div>'
        + '</div></div>';
    },

    'message-info': function () {
      var msg = ((global.JFE.messagesByChat[LV.curChatId] || {})[LV.selMsgId]) || {};
      var seenUids = Object.keys(msg.seenBy || {}).filter(function (u) { return u !== global.JFE.uid && msg.seenBy[u]; });
      return '<div class="scr">'
        + hdr('Message info', '', backBtn('chat'), '')
        + '<div class="body pad nonav">'
        + '<div class="card"><b>' + E(msg.text || msg.kind || 'Message') + '</b><p style="font-size:12px;color:var(--mute);margin-top:4px">Sent ' + fmtTime(msg.ts) + '</p></div>'
        + '<div class="sec">Read receipts</div>'
        + (seenUids.length ? seenUids.map(function (u) { return row(ico('dcheck', 'lime'), 'Read by peer', u.slice(0, 14) + '...', fmtTime(msg.ts), ''); }).join('') : row(ico('check', 'ink'), 'Delivered to server', 'Waiting for recipient read', '', ''))
        + '</div></div>';
    },

    'mute-sheet': function () {
      return SCREENS['chat-info']() + sheet('Mute notifications',
        row(ico('bellOff', 'ink'), 'Mute conversation', 'Unread messages will not alert', '', 'data-act="mute" data-v="1"')
        + row(ico('bell', 'lime'), 'Unmute conversation', 'Restore alert badges & sound', '', 'data-act="mute" data-v="0"'), 'chat-info');
    },

    'delete-chat-sheet': function () {
      return SCREENS['chat-info']() + sheet('Delete chat?',
        '<p style="font-size:13px;color:var(--mute);margin-bottom:12px">Remove this thread from your inbox list.</p>'
        + btn('Delete chat from my inbox', 'red', 'data-act="delchat"'), 'chat-info');
    },

    'clear-chat-sheet': function () {
      return SCREENS['chat-info']() + sheet('Clear messages?',
        '<p style="font-size:13px;color:var(--mute);margin-bottom:12px">Hides all loaded messages in this thread on your account.</p>'
        + btn('Clear history on this device', 'red', 'data-act="clrchat"'), 'chat-info');
    },

    'block-confirm': function () {
      var chat = global.JFE.chats[LV.curChatId] || {};
      var blocked = !!(chat.peerUid && global.JFE.blocked[chat.peerUid]);
      return SCREENS['chat-info']() + sheet(blocked ? 'Unblock peer?' : 'Block peer?',
        '<p style="font-size:13px;color:var(--mute);margin-bottom:12px">' + (blocked ? 'Allow messages and calls again.' : 'They will no longer reach you via DM, calls, or statuses.') + '</p>'
        + btn(blocked ? 'Unblock contact' : 'Block contact', blocked ? '' : 'red', 'data-act="blockchat"'), 'chat-info');
    },

    'leave-group-confirm': function () {
      return SCREENS['group-info']() + sheet('Leave group?',
        btn('Leave & remove group', 'red', 'data-act="delchat"'), 'group-info');
    },

    'logout-confirm': function () {
      return SCREENS['settings']() + sheet('Account session',
        (LV.settings.appLock ? btn(I('lock', 17) + ' Lock app now', 'ink', 'data-act="locknow"') : '')
        + '<div style="margin-top:8px">' + btn(I('logout', 17) + ' Sign out from this device', 'red', 'data-act="dologout"') + '</div>', 'settings');
    },

    // --- Discovery, QR, Contacts & Invite ---
    'new-chat': function () {
      var contacts = knownContacts();
      return '<div class="scr">'
        + hdr('New chat', 'Real verified contacts', backBtn('chats'), '')
        + '<div class="body nonav">'
        + row(ico('userPlus', 'lime'), 'Add friend by @private-id', 'Look up any JChatt user worldwide', I('next', 16), 'data-go="add-contact"')
        + row(ico('users', 'ink'), 'New encrypted group', 'Up to 256 members', I('next', 16), 'data-go="group-new"')
        + row(ico('qr', 'ink'), 'Scan QR or paste invite', 'Connect in person or by link', I('next', 16), 'data-go="qr"')
        + row(ico('share', 'ink'), 'Share one-time invite link', 'No public directory listing needed', I('next', 16), 'data-go="invite"')
        + (contacts.length ? '<div class="sec">Your contacts</div>' + contacts.map(function (c) {
          return row(av(c.handle || c.name, 42, c.avatar), E(c.name), E(c.handle), '', 'data-act="startchat" data-uid="' + E(c.uid) + '"');
        }).join('') : '')
        + '</div></div>';
    },

    'add-contact': function () {
      var a = LV.draftAdd;
      return '<div class="scr">'
        + hdr('Add by @private-id', 'Global Firebase lookup', backBtn('new-chat'), '')
        + '<div class="body pad nonav">'
        + '<div class="sec" style="padding-left:0">Enter Friend\'s Private ID</div>'
        + '<div class="inw" style="margin-bottom:10px"><input id="add-handle" type="text" value="' + E(a.handle) + '" placeholder="@friend.handle"/></div>'
        + btn(a.searching ? 'Searching...' : 'Look up @ID', '', 'data-act="lookupid"')
        + (a.error ? '<div class="err-inline" style="margin-top:10px">' + E(a.error) + '</div>' : '')
        + (a.result ? '<div class="card" style="margin:14px 0 0">'
          + row(av(a.result.handle, 48, a.result.avatar, a.result.online), E(a.result.name || a.result.handle), E(a.result.handle) + ' · ' + E(a.result.bio || 'On JChatt'), '', '')
          + '<div style="margin-top:8px">' + btn('Message now', '', 'data-act="addandchat"') + '</div></div>' : '')
        + '</div></div>';
    },

    'group-new': function () {
      var contacts = knownContacts();
      var g = LV.draftGroup;
      return '<div class="scr">'
        + hdr('New group', Object.keys(g.picked).length + ' selected', backBtn('new-chat'), rb('check', 'data-act="gcreate"'))
        + '<div class="body pad nonav">'
        + '<div class="inw" style="margin-bottom:12px"><input id="grp-name" type="text" value="' + E(g.name) + '" placeholder="Group name (e.g. Weekend Trip)"/></div>'
        + '<div class="sec" style="padding-left:0">Select members from contacts</div>'
        + (contacts.length ? contacts.map(function (c) {
          var on = !!g.picked[c.uid];
          return row(av(c.handle, 40, c.avatar), E(c.name), E(c.handle), '<span class="ck ' + (on ? 'on' : '') + '">' + (on ? I('check', 13) : '') + '</span>', 'data-act="gsel" data-uid="' + E(c.uid) + '"');
        }).join('') : emptyP('users', 'Add a contact first', 'Connect with at least one @private-id first, or create a group note.', btn('Add @ID', '', 'data-go="add-contact"')))
        + '</div></div>';
    },

    'search': function () {
      var q = (LV.searchQ || '').trim().toLowerCase();
      var chats = sortedChats(true).filter(function (c) {
        return !q || (c.name && c.name.toLowerCase().indexOf(q) > -1) || (c.handle && c.handle.toLowerCase().indexOf(q) > -1) || (c.lastText && c.lastText.toLowerCase().indexOf(q) > -1);
      });
      return '<div class="scr">'
        + hdr('Search', 'On this device only', backBtn('chats'), '')
        + '<div class="body pad nonav">'
        + '<div class="inw" style="margin-bottom:12px">' + I('search', 18) + '<input id="glob-search" type="text" value="' + E(LV.searchQ) + '" placeholder="Search names, @IDs or messages..."/></div>'
        + (chats.length ? chats.map(function (c) {
          return row(av(c.name || c.handle, 42, c.avatar), E(c.name || c.handle), E(c.lastText || c.handle || ''), fmtTime(c.lastTs), 'data-act="open" data-id="' + E(c.id) + '"');
        }).join('') : emptyP('search', 'No matches', 'Try another name or @handle.', ''))
        + '</div></div>';
    },

    'qr': function () {
      var invUrl = LV.currentInviteUrl || ('https://jjcodersjchatt.web.app/?handle=' + encodeURIComponent((global.JFE.me && global.JFE.me.handle) || ''));
      return '<div class="scr">'
        + hdr('Scan or Share QR', 'In-person pairing', backBtn('chats'), rb('refresh', 'data-act="mkqr"'))
        + '<div class="body pad nonav">'
        + '<div class="qr" style="margin-bottom:12px">' + global.JCA.qrSvg(invUrl, 172) + '</div>'
        + '<p style="font-size:12px;color:var(--mute);text-align:center;margin-bottom:12px">Scan this QR with any phone camera, or paste an invite token/link below.</p>'
        + '<div class="inw" style="margin-bottom:10px"><input id="qr-paste" type="text" placeholder="Paste ?invite=inv_... link or @handle"/></div>'
        + '<div style="display:grid;gap:8px">'
        + btn('Open invite / lookup @ID', '', 'data-act="claiminput"')
        + btn('Copy my invite link', 'ink', 'data-act="mkqr"')
        + '</div></div></div>';
    },

    'my-qr': function () { return SCREENS['qr'](); },

    'invite': function () {
      return '<div class="scr">'
        + hdr('One-Time Invite Link', 'Single-use capability link', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="text-align:center">'
        + (LV.currentInviteUrl
          ? '<div class="qr" style="margin-bottom:10px">' + global.JCA.qrSvg(LV.currentInviteUrl, 168) + '</div><p style="font-size:11px;word-break:break-all;color:var(--mute)">' + E(LV.currentInviteUrl) + '</p>'
          : '<p style="font-size:13px;color:var(--mute)">Generate a private single-use link stored encrypted in Firebase `/v2/invites`. Expires cleanly after one peer joins.</p>')
        + '</div>'
        + '<div style="display:grid;gap:8px">'
        + btn(I('share', 17) + ' Generate & Copy One-Time Link', '', 'data-act="mkinvite"')
        + '</div></div></div>';
    },

    'archive': function () {
      var archived = Object.keys(global.JFE.chats || {}).map(function (k) { return global.JFE.chats[k]; }).filter(function (c) { return c.archived; });
      return '<div class="scr">'
        + hdr('Archived chats', archived.length + ' threads', backBtn('chats'), '')
        + '<div class="body nonav">'
        + (archived.length ? archived.map(function (c) {
          return row(av(c.name || c.handle, 44, c.avatar), E(c.name || c.handle), E(c.lastText || ''), '<button class="pill" data-act="unarch" data-id="' + E(c.id) + '">Restore</button>', 'data-act="open" data-id="' + E(c.id) + '"');
        }).join('') : emptyP('archive', 'Nothing archived', 'Archived threads appear here quietly.', ''))
        + '</div></div>';
    },

    'folders': function () {
      return '<div class="scr">'
        + hdr('Chat folders', '', backBtn('chats'), '')
        + '<div class="body nonav">'
        + LV.settings.folders.map(function (f) {
          return row(ico('folder', 'lime'), E(f.name), 'Tap to filter inbox', I('next', 16), 'data-act="filt" data-v="' + E(f.id) + '" data-go="chats"');
        }).join('')
        + '</div></div>';
    },

    'starred': function () {
      var items = [];
      Object.keys(global.JFE.messagesByChat || {}).forEach(function (cid) {
        var box = global.JFE.messagesByChat[cid];
        Object.keys(box).forEach(function (mid) {
          if (LV.settings.starredIds[mid]) items.push({ chatId: cid, msg: box[mid] });
        });
      });
      return '<div class="scr">'
        + hdr('Starred messages', items.length + ' saved', backBtn('settings'), '')
        + '<div class="body nonav">'
        + (items.length ? items.map(function (it) {
          return row(ico('star', 'lime'), E(it.msg.text || it.msg.kind), E(it.msg.fromName || ''), fmtTime(it.msg.ts), 'data-act="open" data-id="' + E(it.chatId) + '"');
        }).join('') : emptyP('star', 'No starred messages', 'Tap any bubble in a chat and choose Star to bookmark it here.', ''))
        + '</div></div>';
    },

    'status-compose': function () {
      var st = LV.draftStatus;
      var colors = ['#0a2230', '#14453f', '#0f4fb8', '#7c2d12', '#4c1d95'];
      return '<div class="scr" style="background:' + E(st.bg) + ';color:#fff">'
        + hdr('Post 24h Status', '', backBtn('updates'), rb('photo', 'data-act="pickstphoto"'))
        + '<div style="flex:1;display:grid;place-items:center;padding:24px">'
        + (st.imgData ? '<img src="' + E(st.imgData) + '" style="max-height:220px;border-radius:16px;margin-bottom:12px"/>' : '')
        + '<textarea id="st-text" rows="4" style="width:100%;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:18px;padding:14px;font:18px/1.35 Sora,sans-serif;text-align:center" placeholder="Type a private update...">' + E(st.text) + '</textarea>'
        + '</div>'
        + '<div style="padding:14px 18px;display:grid;gap:12px">'
        + '<div class="sw3" style="justify-content:center">' + colors.map(function (c) { return '<button class="dotc" style="background:' + c + '" data-act="stcol" data-v="' + c + '"></button>'; }).join('') + '</div>'
        + btn(I('send', 17) + ' Share 24h update', '', 'data-act="poststatus"')
        + '</div></div>';
    },

    'status-view': function () {
      var list = global.JFE.getVisibleStatuses();
      var st = list.find(function (s) { return s.id === LV.viewingStatusId; }) || list[0];
      if (!st) return SCREENS['updates']();
      var viewers = Object.keys(st.viewers || {}).map(function (u) { return st.viewers[u]; });
      return '<div class="scr" style="background:' + E(st.bg || '#0a2230') + ';color:#fff">'
        + hdr(E(st.name || st.handle), fmtTime(st.ts), backBtn('updates'), '')
        + '<div style="flex:1;display:grid;place-items:center;padding:28px;text-align:center">'
        + (st.imgData ? '<img src="' + E(st.imgData) + '" style="max-height:55vh;border-radius:16px;margin-bottom:12px"/>' : '')
        + '<div style="font-size:22px;font-weight:700">' + E(st.text || '') + '</div>'
        + '</div>'
        + '<div style="padding:14px 18px;font-size:12px;opacity:.8;text-align:center">' + I('eye', 14) + ' Viewed by ' + viewers.length + ' contact' + (viewers.length === 1 ? '' : 's') + '</div>'
        + '</div>';
    },

    'call-voice': function () { return renderCallScreen(false); },
    'call-video': function () { return renderCallScreen(true); },
    'call-group': function () { return renderCallScreen(true); },

    'incoming-call': function () {
      var inc = global.JFE.incomingCall;
      if (!inc) return SCREENS['chats']();
      return '<div class="scr center" style="background:linear-gradient(170deg,#0a2230,#14453f);color:#fff">'
        + av(inc.fromName || inc.fromHandle, 92, inc.fromAvatar)
        + '<h2>' + E(inc.fromName || inc.fromHandle || 'Caller') + '</h2>'
        + '<p class="mute">' + (inc.video ? 'Incoming encrypted video call' : 'Incoming encrypted voice call') + '</p>'
        + '<div class="ctl" style="margin-top:28px">'
        + '<button class="end" data-act="declinecall">' + I('phoneOff', 22) + '</button>'
        + '<button style="background:var(--lime);color:var(--ink)" data-act="answercall">' + I(inc.video ? 'video' : 'calls', 22) + '</button>'
        + '</div></div>';
    },

    'call-ended': function () {
      var sum = LV.lastCallSummary || { name: 'Call ended', durSec: 0 };
      return '<div class="scr center" style="background:var(--ink);color:#fff">'
        + ico('calls', 'lime', 28)
        + '<h2>' + E(sum.name || 'Call ended') + '</h2>'
        + '<p class="mute">Duration: ' + fmtDur(sum.durSec || 0) + ' · Logged locally</p>'
        + '<div style="width:220px;margin-top:14px">' + btn('Back to Chats', '', 'data-go="chats"') + '</div>'
        + '</div>';
    },

    'privacy-policy': function () {
      return '<div class="scr" style="background:#fff;color:var(--ink);overflow-y:auto">'
        + (global.JCLANDING ? global.JCLANDING.renderLegalDoc('privacy') : '')
        + '</div>';
    },

    'terms-of-service': function () {
      return '<div class="scr" style="background:#fff;color:var(--ink);overflow-y:auto">'
        + (global.JCLANDING ? global.JCLANDING.renderLegalDoc('terms') : '')
        + '</div>';
    },

    'security-whitepaper': function () {
      return '<div class="scr" style="background:#fff;color:var(--ink);overflow-y:auto">'
        + (global.JCLANDING ? global.JCLANDING.renderLegalDoc('security') : '')
        + '</div>';
    },

    'warrant-canary': function () {
      return '<div class="scr" style="background:#fff;color:var(--ink);overflow-y:auto">'
        + (global.JCLANDING ? global.JCLANDING.renderLegalDoc('canary') : '')
        + '</div>';
    },

    'landing': function () {
      return global.JCLANDING ? global.JCLANDING.renderLandingPage(LV.legalModal) : '';
    }
  };

  function renderChatScreen(isGroup) {
    var Engine = global.JFE;
    var chatId = LV.curChatId;
    var chat = Engine.chats[chatId] || { id: chatId, name: isGroup ? 'Group' : 'Chat', timer: 'off' };
    var pres = chat.peerUid && Engine.peerPresence[chat.peerUid];
    var sub = isGroup
      ? (Object.keys(chat.members || {}).length + ' members')
      : (pres && pres.online ? 'online now' : (chat.handle || 'encrypted'));
    var right = (chat.peerUid
      ? rb('calls', 'data-act="callto" data-uid="' + E(chat.peerUid) + '" data-v="0"')
        + ' ' + rb('video', 'data-act="callto" data-uid="' + E(chat.peerUid) + '" data-v="1"') + ' '
      : '') + rb('more', 'data-go="' + (isGroup ? 'group-info' : 'chat-info') + '"');

    return '<div class="scr">'
      + hdr(
        '<span data-go="' + (isGroup ? 'group-info' : 'chat-info') + '" style="cursor:pointer">' + E(chat.name || chat.handle || 'Chat') + '</span>',
        sub,
        backBtn('chats') + ' ' + av(chat.name || chat.handle || chatId, 38, chat.avatar, !!(pres && pres.online)),
        right
      )
      + '<div class="msgs" id="chat-msgs">' + renderMessagesList(chatId) + '</div>'
      + renderComposer(chat, false)
      + '</div>';
  }

  function renderChatInfo(isGroup) {
    var Engine = global.JFE;
    var chat = Engine.chats[LV.curChatId] || {};
    var blocked = !!(chat.peerUid && Engine.blocked[chat.peerUid]);
    var body = '<div style="display:grid;place-items:center;padding:12px 0">'
      + av(chat.name || chat.handle || 'peer', 78, chat.avatar)
      + '<h2 style="margin-top:10px">' + E(chat.name || 'Chat') + '</h2>'
      + '<p style="font-size:12px;color:var(--mute)">' + E(chat.handle || (isGroup ? (Object.keys(chat.members || {}).length + ' participants') : '')) + '</p>'
      + '</div>'
      + '<div class="card">'
      + row(ico('timer', 'lime'), 'Disappearing timer', (chat.timer || 'off').toUpperCase(), I('next', 16), 'data-go="timer-sheet"')
      + row(ico('lock', 'ink'), 'Verify safety number', 'Compare 60-digit fingerprint', I('next', 16), 'data-go="safety"')
      + row(ico('photo', 'ink'), 'Shared media', 'Photos & files in this thread', I('next', 16), 'data-go="chat-media"')
      + row(ico('search', 'ink'), 'Search inside thread', 'On-device instant filter', I('next', 16), 'data-go="chat-search"')
      + '</div>'
      + '<div class="card">'
      + row(ico('pin', chat.pinned ? 'lime' : ''), chat.pinned ? 'Unpin conversation' : 'Pin conversation', 'Keep at top of inbox', '<span class="sw ' + (chat.pinned ? 'on' : '') + '"></span>', 'data-act="pinchat"')
      + row(ico('bellOff', chat.muted ? 'org' : ''), 'Mute notifications', chat.muted ? 'Muted' : 'Active alerts', '<span class="sw ' + (chat.muted ? 'on' : '') + '"></span>', 'data-go="mute-sheet"')
      + row(ico('archive', 'ink'), chat.archived ? 'Unarchive chat' : 'Archive chat', 'Hide from main list', '<span class="sw ' + (chat.archived ? 'on' : '') + '"></span>', 'data-act="archchat"')
      + row(ico('lock', LV.settings.vaultChatIds[LV.curChatId] ? 'lime' : ''), 'Move to Hidden Vault', 'Require Vault PIN to view', '<span class="sw ' + (LV.settings.vaultChatIds[LV.curChatId] ? 'on' : '') + '"></span>', 'data-act="lockchat"')
      + '</div>'
      + '<div class="card">'
      + (!isGroup ? row(ico('block', 'org'), blocked ? 'Unblock contact' : 'Block contact', '', '', 'data-go="block-confirm"') : '')
      + row(ico('trash', 'org'), 'Clear messages', 'Erase loaded thread on this device', '', 'data-go="clear-chat-sheet"')
      + row(ico('trash2', 'org'), isGroup ? 'Leave & remove group' : 'Delete conversation', '', '', 'data-go="' + (isGroup ? 'leave-group-confirm' : 'delete-chat-sheet') + '"')
      + '</div>';
    return '<div class="scr">'
      + hdr(isGroup ? 'Group info' : 'Contact info', '', backBtn(isGroup ? 'chat-group' : 'chat'), '')
      + '<div class="body pad nonav">' + body + '</div></div>';
  }

  function renderCallScreen(isVideo) {
    var c = global.JFE.activeCall;
    if (!c) return SCREENS['calls']();
    var elapsed = c.connectedAt ? fmtDur((Date.now() - c.connectedAt) / 1000) : 'Ringing...';
    return '<div class="scr center" style="background:linear-gradient(170deg,#0a2230,#091922);color:#fff">'
      + '<audio id="call-screen-audio" autoplay playsinline style="display:none"></audio>'
      + (isVideo
        ? '<video id="remote-video" autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9"></video>'
          + '<video id="local-video" autoplay muted playsinline style="position:absolute;right:14px;top:64px;width:96px;height:132px;border-radius:14px;object-fit:cover;border:2px solid var(--lime)"></video>'
        : '')
      + '<div style="position:relative;z-index:2;display:grid;place-items:center;gap:10px">'
      + av(c.peer.name || c.peer.handle, 96, c.peer.avatar)
      + '<h2>' + E(c.peer.name || c.peer.handle) + '</h2>'
      + '<p class="mute">' + E(elapsed) + ' · Encrypted E2EE WebRTC</p>'
      + '</div>'
      + '<div class="ctl" style="position:relative;z-index:2;margin-top:32px">'
      + '<button data-act="callmute" style="background:' + (c.muted ? '#fff' : 'rgba(255,255,255,.18)') + ';color:' + (c.muted ? '#0a2230' : '#fff') + '">' + I(c.muted ? 'micOff' : 'mic', 20) + '</button>'
      + '<button class="end" data-act="endcall">' + I('phoneOff', 22) + '</button>'
      + '</div></div>';
  }

  global.JCS = {
    LV: LV,
    DURESS_CHATS: DURESS_CHATS,
    SCREENS: SCREENS,
    av: av,
    rb: rb,
    backBtn: backBtn,
    hdr: hdr,
    btn: btn,
    chip: chip,
    ico: ico,
    togRow: togRow,
    row: row,
    fmtTime: fmtTime,
    fmtDur: fmtDur,
    navBar: navBar,
    emptyP: emptyP,
    skList: skList,
    sheet: sheet,
    sortedChats: sortedChats,
    knownContacts: knownContacts,
    shieldScore: shieldScore,
    renderMessagesList: renderMessagesList,
    renderComposer: renderComposer
  };
})(window);
