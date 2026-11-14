/* ===== JCHATT v2 DESKTOP + MOBILE CONTROLLER & ACTION DISPATCHER ===== */
(function (global) {
  'use strict';

  var JCA = global.JCA;
  var JFE = global.JFE;
  var JCS = global.JCS;
  var LV = JCS.LV;
  var E = JCA.escHtml;
  var I = JCA.ic;

  if (global.JCS_INIT_EXTRA) global.JCS_INIT_EXTRA();

  var toastTimer = null;
  var typingTimeout = null;
  var lastTypingPing = 0;
  var voiceTimer = null;
  var mediaRec = null;
  var voiceChunks = [];
  var unlockTapCount = 0;
  var unlockTapReset = null;
  var authResolved = false;
  var splashDone = false;
  var initialRouted = false;
  var prevMsgCountByChat = {};
  var audioPlayer = null;
  var viewOncePending = false;
  var photoTargetMode = 'chat'; // 'chat' | 'status'
  var lastRenderedHtml = '';

  global.JCHATT_DRAFT = '';

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2400);
  }

  function themeCls() {
    var cls = [];
    if (LV.settings.darkMode) cls.push('ui-dark');
    if (LV.settings.theme === 'mint') cls.push('th-mint');
    if (LV.settings.theme === 'blue') cls.push('th-blue');
    if (LV.settings.largeText) cls.push('large-txt');
    return cls.join(' ');
  }

  var PHONE_ONLY_ROUTES = {
    'splash': 1, 'welcome-1': 1, 'welcome-2': 1, 'welcome-3': 1,
    'create-id': 1, 'restore-account': 1, 'secure-device': 1,
    'permissions': 1, 'account-ready': 1,
    'lockscreen': 1, 'duress-decoy': 1, 'burn-account': 1,
    'fake-calc': 1, 'fake-notes': 1, 'fake-weather': 1, 'fake-clock': 1, 'fake-fitness': 1,
    'landing': 1, 'privacy-policy': 1, 'terms-of-service': 1, 'security-whitepaper': 1, 'warrant-canary': 1
  };
  var MODAL_ROUTES = {
    'new-chat': 1, 'add-contact': 1, 'group-new': 1, 'search': 1, 'qr': 1, 'my-qr': 1, 'invite': 1,
    'timer-sheet': 1, 'attach-sheet': 1, 'stickers': 1, 'poll-create': 1, 'msg-actions': 1,
    'forward-picker': 1, 'chat-info': 1, 'group-info': 1, 'safety': 1, 'chat-media': 1,
    'chat-search': 1, 'message-info': 1, 'mute-sheet': 1, 'delete-chat-sheet': 1,
    'clear-chat-sheet': 1, 'block-confirm': 1, 'leave-group-confirm': 1, 'logout-confirm': 1,
    'voice-record': 1, 'photo-view': 1, 'doc-viewer': 1, 'status-compose': 1, 'status-view': 1,
    'ai-summary': 1, 'user-profile': 1, 'archive': 1, 'folders': 1, 'starred': 1
  };
  var SHIELD_ROUTES = {
    'shield': 1, 'masks': 1, 'devices': 1, 'disguise': 1, 'disguise-icons': 1, 'disguise-notify': 1,
    'disguise-shot': 1, 'disguise-more': 1, 'vault-lock': 1, 'vault': 1, 'network': 1, 'mesh': 1,
    'break-in': 1, 'panic-setup': 1, 'insights': 1
  };

  function isDesktopShellRoute() {
    var r = LV.route;
    if (PHONE_ONLY_ROUTES[r] || (!LV.settings.onboarded && r === 'recovery-phrase')) return false;
    return global.innerWidth > 760 && !!JFE.uid && !LV.locked && !LV.duressMode;
  }

  function go(route, anim) {
    if (!route || !JCS.SCREENS[route]) return;
    if (global.innerWidth > 760 && JFE.uid && !LV.locked && !LV.duressMode && !PHONE_ONLY_ROUTES[route]) {
      LV.route = (route === 'chat' || route === 'chat-group' || MODAL_ROUTES[route]) ? 'chats' : route;
      if (route === 'chats' || route === 'updates' || route === 'calls' || route === 'shield' || route === 'settings') {
        LV.wtab = route;
        LV.wmodal = null;
        if (route === 'shield') LV.wSettingsPage = 'shield';
        if (route === 'settings') LV.wSettingsPage = 'profile-edit';
      } else if (route === 'chat' || route === 'chat-group') {
        LV.wtab = 'chats';
        LV.wmodal = null;
      } else if (MODAL_ROUTES[route]) {
        LV.wmodal = route;
      } else {
        LV.wtab = SHIELD_ROUTES[route] ? 'shield' : 'settings';
        if (LV.wSettingsPage && LV.wSettingsPage !== route) {
          LV.hist.push('ws:' + LV.wSettingsPage);
        }
        LV.wSettingsPage = route;
        LV.wmodal = null;
      }
      render(true);
      return;
    }
    if (LV.route && LV.route !== route && !anim) {
      LV.hist.push(LV.route);
      if (LV.hist.length > 24) LV.hist.shift();
    }
    LV.anim = anim || 'push';
    LV.route = route;
    if (route === 'chats' || route === 'updates' || route === 'calls' || route === 'shield' || route === 'settings') {
      LV.wtab = route;
      LV.anim = 'tab';
    }
    if (route === 'chat' || route === 'chat-group') {
      LV.wtab = 'chats';
    }
    render(true);
  }

  function goBack() {
    if (LV.wmodal && isDesktopShellRoute()) {
      LV.wmodal = null;
      render();
      return;
    }
    var prev = LV.hist.pop();
    if (prev && prev.indexOf('ws:') === 0 && isDesktopShellRoute()) {
      LV.wSettingsPage = prev.slice(3);
      render();
      return;
    }
    if (!prev) {
      prev = JFE.uid ? 'chats' : 'welcome-1';
    }
    LV.anim = 'pop';
    LV.route = prev;
    render(true);
  }

  // --- Desktop Web Workspace Renderer (Adapted from Agent Pack) ---
  function renderDesktopWeb() {
    var me = JFE.me || {};
    var tab = LV.wtab || 'chats';
    var chats = JCS.sortedChats(false);
    var curChat = LV.curChatId && JFE.chats[LV.curChatId];
    var isOpen = !!curChat && tab === 'chats';
    var railItems = [
      ['chats', 'chats', 'Chats'],
      ['updates', 'updates', 'Updates'],
      ['calls', 'calls', 'Calls'],
      ['shield', 'shield', 'Shield'],
      ['settings', 'settings', 'Settings']
    ];

    var railHtml = '<div class="wrail">'
      + '<div class="wlogo"><img src="' + JCA.ASSETS.mascotHero + '" width="42" height="42" style="object-fit:contain;border-radius:12px" alt="JChatt"/></div>'
      + railItems.map(function (it) {
        return '<button class="' + (tab === it[0] ? 'on' : '') + '" data-act="wtab" data-v="' + it[0] + '">' + I(it[1], 20) + '<span>' + it[2] + '</span></button>';
      }).join('')
      + '<div style="margin-top:auto;display:grid;gap:8px;justify-items:center">'
      + '<button title="Toggle Dark Mode" data-act="tg" data-k="darkMode" style="height:40px">' + I(LV.settings.darkMode ? 'sun' : 'moon', 19) + '</button>'
      + '<button title="' + E(me.handle || 'Account') + '" data-act="wsettings" data-v="profile-edit" style="height:44px">' + JCS.av(me.handle || 'me', 34, me.avatar, true) + '</button>'
      + '</div></div>';

    var listCol = '';
    var mainCol = '';
    var infoCol = '';
    var showInfo = isOpen && LV.winfo && tab === 'chats';

    if (tab === 'chats') {
      var filtChats = chats.filter(function (c) {
        if (LV.filter === 'unread') return (c.unread || 0) > 0;
        if (LV.filter === 'groups') return c.kind === 'group';
        return true;
      });
      var archN = Object.keys(JFE.chats || {}).filter(function (k) { return JFE.chats[k].archived; }).length;
      listCol = '<div class="wlist">'
        + '<div class="whd"><b>jchatt</b>'
        + JCS.rb('search', 'data-act="wmodal" data-v="search" title="Search (Ctrl+K)"')
        + JCS.rb('userPlus', 'data-act="wmodal" data-v="add-contact" title="Add @ID (Ctrl+N)"')
        + JCS.rb('qr', 'data-act="wmodal" data-v="qr" title="QR / Invite"')
        + '</div>'
        + '<div class="chips" style="background:transparent;padding:8px 12px">'
        + JCS.chip('all', 'All', LV.filter === 'all')
        + JCS.chip('unread', 'Unread', LV.filter === 'unread')
        + JCS.chip('groups', 'Groups', LV.filter === 'groups')
        + '</div>'
        + '<div style="flex:1;overflow:auto">'
        + (archN ? JCS.row(JCS.ico('archive', 'ink'), 'Archived chats', archN + ' hidden', '', 'data-act="wmodal" data-v="archive"') : '')
        + (filtChats.length ? filtChats.map(function (c) {
          var sel = c.id === LV.curChatId;
          var badge = c.unread > 0 ? '<span class="badge">' + c.unread + '</span>' : '';
          var pres = c.peerUid && JFE.peerPresence[c.peerUid];
          return JCS.row(
            JCS.av(c.name || c.handle, 44, c.avatar, !!(pres && pres.online)),
            E(c.name || c.handle),
            E(c.lastText || (c.kind === 'group' ? 'Group chat' : c.handle || 'Ready')),
            (c.lastTs ? JCS.fmtTime(c.lastTs) + ' ' : '') + badge,
            'data-act="wchat" data-id="' + E(c.id) + '"',
            'wrow ' + (sel ? 'on' : '')
          );
        }).join('') : JCS.emptyP('chats', 'Quiet in here', 'Add any contact by @private-id or generate a single-use invite link.', JCS.btn(I('userPlus', 16) + ' Add by @ID', '', 'data-act="wmodal" data-v="add-contact"') + JCS.btn(I('share', 16) + ' Invite Link', 'ink', 'data-act="wmodal" data-v="invite"')))
        + '</div>'
        + '<div style="padding:10px 12px;border-top:1px solid var(--line);font-size:11px;color:var(--mute);display:flex;justify-content:space-between">'
        + '<span>' + E(me.handle || '') + '</span>'
        + '<span><span class="kbd">Ctrl</span>+<span class="kbd">K</span></span>'
        + '</div></div>';

      if (curChat) {
        var pres = curChat.peerUid && JFE.peerPresence[curChat.peerUid];
        var sub = curChat.kind === 'group'
          ? (Object.keys(curChat.members || {}).length + ' members')
          : (pres && pres.online ? 'online now' : (curChat.handle || 'E2EE verified'));
        mainCol = '<div class="wmain">'
          + (!JFE.connected ? '<div class="wbanner"><span class="spin"></span> Reconnecting to Firebase RTDB...</div>' : '')
          + JCS.hdr(
            E(curChat.name || curChat.handle),
            sub,
            '<button class="rb o wback" data-act="wback">' + I('back', 19) + '</button>' + JCS.av(curChat.name || curChat.handle, 38, curChat.avatar, !!(pres && pres.online)),
            (curChat.peerUid ? JCS.rb('calls', 'data-act="callto" data-uid="' + E(curChat.peerUid) + '" data-v="0"') + ' ' + JCS.rb('video', 'data-act="callto" data-uid="' + E(curChat.peerUid) + '" data-v="1"') + ' ' : '')
            + '<button class="rb o" data-act="winfo" title="Toggle info pane">' + I('info', 19) + '</button>'
          )
          + '<div class="msgs" id="chat-msgs">' + JCS.renderMessagesList(curChat.id) + '</div>'
          + JCS.renderComposer(curChat, true)
          + '</div>';

        if (showInfo) {
          var media = JFE.getChatMessages(curChat.id).filter(function (m) { return m.kind === 'photo' && m.imgData; });
          infoCol = '<div class="winfo">'
            + '<div style="display:grid;place-items:center;text-align:center;margin-bottom:14px">'
            + JCS.av(curChat.name || curChat.handle, 72, curChat.avatar, !!(pres && pres.online))
            + '<b style="margin-top:8px;font-size:16px">' + E(curChat.name || 'Chat') + '</b>'
            + '<span style="font-size:12px;color:var(--mute)">' + E(curChat.handle || '') + '</span>'
            + '</div>'
            + JCS.row(JCS.ico('timer', 'lime'), 'Vanish timer', (curChat.timer || 'off').toUpperCase(), I('next', 15), 'data-act="wmodal" data-v="timer-sheet"')
            + JCS.row(JCS.ico('lock', 'ink'), 'Safety number', 'Compare fingerprint', I('next', 15), 'data-act="wmodal" data-v="safety"')
            + JCS.row(JCS.ico('pin', curChat.pinned ? 'lime' : ''), curChat.pinned ? 'Unpin chat' : 'Pin chat', '', '', 'data-act="pinchat"')
            + JCS.row(JCS.ico('bellOff', curChat.muted ? 'org' : ''), curChat.muted ? 'Unmute chat' : 'Mute chat', '', '', 'data-act="mute" data-v="' + (curChat.muted ? '0' : '1') + '"')
            + JCS.row(JCS.ico('archive', 'ink'), curChat.archived ? 'Unarchive' : 'Archive chat', '', '', 'data-act="archchat"')
            + JCS.row(JCS.ico('lock', LV.settings.vaultChatIds[curChat.id] ? 'lime' : ''), LV.settings.vaultChatIds[curChat.id] ? 'Remove from Vault' : 'Hide in Vault', '', '', 'data-act="lockchat"')
            + (media.length ? '<div class="sec">Shared Media</div><div class="wmedia">' + media.slice(0, 6).map(function (m) {
              return '<div class="sq" data-act="openphoto" data-id="' + E(m.id) + '"><img src="' + E(m.imgData) + '"/></div>';
            }).join('') + '</div>' : '')
            + '<div style="margin-top:12px">' + JCS.btn('Delete conversation', 'red', 'data-act="delchat"') + '</div>'
            + '</div>';
        }
      } else {
        mainCol = '<div class="wmain"><div class="wcenter" style="flex:1">'
          + JCA.mascot('happy', 110)
          + '<h2>JChatt Web Workspace</h2>'
          + '<p style="color:var(--mute);max-width:340px">Select any conversation on the left, add a peer by @private-id, or share a one-time invite link.</p>'
          + '<div style="display:flex;gap:10px">'
          + '<button class="pill on" data-act="wmodal" data-v="add-contact">' + I('userPlus', 15) + ' Add by @ID</button>'
          + '<button class="pill" data-act="wmodal" data-v="invite">' + I('share', 15) + ' Invite Link</button>'
          + '<button class="pill" data-act="wmodal" data-v="group-new">' + I('users', 15) + ' New Group</button>'
          + '</div></div></div>';
      }
    } else if (tab === 'settings' || tab === 'shield') {
      var pages = tab === 'shield'
        ? [['shield', 'Security Shield', 'shield'], ['masks', 'Identity Masks', 'mask'], ['devices', 'Linked Devices', 'laptop'], ['disguise', 'App Disguise', 'calc'], ['vault-lock', 'Hidden Vault', 'lock'], ['network', 'Network & Relay', 'globe']]
        : [['profile-edit', 'Account & Profile', 'user'], ['appearance', 'Appearance & Themes', 'palette'], ['privacy-settings', 'Privacy & Locks', 'lock'], ['notifications', 'Notifications', 'bell'], ['storage', 'Storage & Backup', 'cloud'], ['devices', 'Linked Devices', 'laptop'], ['invite', 'Invite & QR', 'share'], ['wallet', 'Local Ledger', 'wallet'], ['explore', '36+ Mini-Apps', 'compass'], ['help-center', 'Help & About', 'info']];
      var subId = LV.wSettingsPage || pages[0][0];
      if (!JCS.SCREENS[subId]) subId = pages[0][0];

      listCol = '<div class="wlist"><div class="whd"><b>' + (tab === 'shield' ? 'Shield' : 'Settings') + '</b></div>'
        + '<div style="flex:1;overflow:auto">'
        + pages.map(function (p) {
          return JCS.row(JCS.ico(p[2], subId === p[0] ? 'lime' : ''), E(p[1]), '', '', 'data-act="wsettings" data-v="' + p[0] + '"', 'wrow ' + (subId === p[0] ? 'on' : ''));
        }).join('')
        + '<div style="padding:12px">' + JCS.btn(I('logout', 16) + ' Sign out', 'red', 'data-act="dologout"') + '</div>'
        + '</div></div>';
      // Render chosen settings/shield subscreen directly inside .wmain!
      mainCol = '<div class="wmain" style="position:relative;overflow:hidden">'
        + '<div class="desktop-sub">' + JCS.SCREENS[subId]() + '</div>'
        + '</div>';
    } else {
      // Updates or Calls fullscreen inside workspace
      mainCol = '<div class="wfull" style="position:relative;height:100%;min-height:0">' + JCS.SCREENS[tab]() + '</div>';
    }

    var modalHtml = renderWebModal() + renderWebCallOverlay();

    return '<div class="webwrap"><div class="wbox">'
      + '<div class="web ' + (showInfo ? '' : 'noinfo ') + (isOpen ? 'open ' : '') + themeCls() + '">'
      + railHtml + listCol + mainCol + infoCol + modalHtml
      + '</div></div></div>';
  }

  function renderWebModal() {
    var m = LV.wmodal;
    if (!m && JFE.incomingCall) m = 'incoming-call';
    if (!m) return '';
    var inner = '';
    var title = '';
    if (m === 'incoming-call' && JFE.incomingCall) {
      var inc = JFE.incomingCall;
      return '<div class="wscrim"></div><div class="wmod" style="padding:20px;text-align:center">'
        + JCS.av(inc.fromName || inc.fromHandle, 72, inc.fromAvatar)
        + '<h3 style="margin-top:8px">' + E(inc.fromName || inc.fromHandle) + '</h3>'
        + '<p style="color:var(--mute);margin-bottom:16px">' + (inc.video ? 'Incoming video call' : 'Incoming voice call') + '</p>'
        + '<div class="ctl"><button class="end" data-act="declinecall">' + I('phoneOff', 20) + '</button>'
        + '<button style="background:var(--lime);color:var(--ink)" data-act="answercall">' + I(inc.video ? 'video' : 'calls', 20) + '</button></div></div>';
    }
    if (JCS.SCREENS[m]) {
      return '<div class="wscrim" data-act="wclose"></div><div class="wmod" style="height:min(580px,85vh)"><div style="position:relative;flex:1;min-height:0">' + JCS.SCREENS[m]() + '</div></div>';
    }
    return '';
  }

  function renderWebCallOverlay() {
    if (!JFE.activeCall) return '';
    return '<div class="wcall">' + JCS.SCREENS[JFE.activeCall.video ? 'call-video' : 'call-voice']() + '</div>';
  }

  var callTimerInterval = null;
  function updateCallTicker() {
    if (JFE.activeCall && JFE.activeCall.status === 'connected') {
      if (!callTimerInterval) {
        callTimerInterval = setInterval(function () {
          if (JFE.activeCall && (LV.route === 'call-voice' || LV.route === 'call-video' || isDesktopShellRoute())) {
            render(false);
          } else {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
          }
        }, 1000);
      }
    } else {
      if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
      }
    }
  }
  // --- Master Render Engine with Input Focus & Scroll Preservation ---
  function render(forceScrollBottom) {
    var root = document.getElementById('app');
    if (!root) return;

    var active = document.activeElement;
    var activeId = active && active.id ? active.id : null;
    var activeVal = active && typeof active.value === 'string' ? active.value : null;
    var selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    var selEnd = active && typeof active.selectionEnd === 'number' ? active.selectionEnd : null;
    var msgBox = document.getElementById('chat-msgs');
    var prevScrollBottom = msgBox ? (msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 60) : true;

    var nextHtml = '';
    if (LV.route === 'landing') {
      nextHtml = global.JCLANDING ? global.JCLANDING.renderLandingPage(LV.legalModal) : '';
    } else if (LV.route === 'privacy-policy' || LV.route === 'terms-of-service' || LV.route === 'security-whitepaper' || LV.route === 'warrant-canary') {
      var dKey = LV.route === 'terms-of-service' ? 'terms' : (LV.route === 'security-whitepaper' ? 'security' : (LV.route === 'warrant-canary' ? 'canary' : 'privacy'));
      nextHtml = '<div style="min-height:100vh;background:#fff">' + (global.JCLANDING ? global.JCLANDING.renderLegalDoc(dKey) : '') + '</div>';
    } else if (isDesktopShellRoute()) {
      nextHtml = renderDesktopWeb();
    } else {
      var sFn = JCS.SCREENS[LV.route] || JCS.SCREENS['splash'];
      var phoneBg = '';
      if (LV.route.indexOf('welcome-') === 0 || LV.route === 'account-ready') phoneBg = 'paper';
      nextHtml = '<div class="studio"><div class="proto"><div class="phone ' + phoneBg + ' ' + themeCls() + '">'
        + sFn().replace('class="scr"', 'class="scr ' + (LV.anim || '') + '"')
        + '</div></div></div>';
      LV.anim = '';
    }

    if (nextHtml !== lastRenderedHtml) {
      lastRenderedHtml = nextHtml;
      root.innerHTML = nextHtml;
    } else {
      LV.anim = '';
    }

    // Restore focused input cursor smoothly
    if (activeId) {
      var restored = document.getElementById(activeId);
      if (restored) {
        if (activeVal !== null && restored.value !== activeVal) restored.value = activeVal;
        try {
          restored.focus({ preventScroll: true });
          if (selStart !== null && restored.setSelectionRange) restored.setSelectionRange(selStart, selEnd);
        } catch (e) {}
      }
    }

    // Attach media streams if WebRTC call screen active
    var rVid = document.getElementById('remote-video');
    if (rVid && JFE._remoteStream && rVid.srcObject !== JFE._remoteStream) rVid.srcObject = JFE._remoteStream;
    var lVid = document.getElementById('local-video');
    if (lVid && JFE._localStream && lVid.srcObject !== JFE._localStream) lVid.srcObject = JFE._localStream;
    var rAud = document.getElementById('call-screen-audio');
    if (rAud && JFE._remoteStream && rAud.srcObject !== JFE._remoteStream) {
      rAud.srcObject = JFE._remoteStream;
      rAud.play().catch(function () {});
    }
    updateCallTicker();

    // Auto-scroll active chat messages when new message arrives or opened
    var newMsgBox = document.getElementById('chat-msgs');
    if (newMsgBox) {
      var count = LV.curChatId ? JFE.getChatMessages(LV.curChatId).length : 0;
      var grew = count > (prevMsgCountByChat[LV.curChatId] || 0);
      prevMsgCountByChat[LV.curChatId] = count;
      if (forceScrollBottom || grew || prevScrollBottom) {
        newMsgBox.scrollTop = newMsgBox.scrollHeight;
      }
    }
  }

  function tryBiometricUnlock() {
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var Bio = Plugins && (Plugins.BiometricAuth || (Cap && Cap.Plugins && Cap.Plugins.BiometricAuth));
      if (Bio && Bio.authenticate) {
        Bio.authenticate({
          title: 'Unlock JChatt',
          subtitle: 'Touch the fingerprint sensor or confirm face'
        }).then(function (res) {
          if (res && res.success) {
            LV.locked = false;
            LV.pinBuffer = '';
            LV.pinError = '';
            if (global.JCSOUND && global.JCSOUND.playMsgReceived) {
              try { global.JCSOUND.playMsgReceived(); } catch (e) {}
            }
            toast('Unlocked with Fingerprint');
            go('chats', 'pop');
          } else if (res && res.error) {
            console.log('Biometric auth:', res.error);
          }
        }).catch(function (err) {
          console.log('Biometric error:', err);
        });
      } else {
        toast('Fingerprint sensor active on device');
      }
    } catch (e) {
      console.log('Biometric error:', e);
    }
  }

  // --- Action Dispatcher ---
  var ACT = {
    dobioauth: function () {
      tryBiometricUnlock();
    },
    open: function (el) {
      var id = el.getAttribute('data-id');
      if (!id) return;
      LV.curChatId = id;
      LV.chatSearchQ = '';
      LV.replyTo = null;
      JFE.openChat(id);
      var chat = JFE.chats[id];
      go(chat && chat.kind === 'group' ? 'chat-group' : 'chat', 'push');
    },
    wtab: function (el) {
      LV.wtab = el.getAttribute('data-v');
      LV.wmodal = null;
      render();
    },
    wchat: function (el) {
      var id = el.getAttribute('data-id');
      LV.curChatId = id;
      LV.replyTo = null;
      LV.wmodal = null;
      JFE.openChat(id);
      render(true);
    },
    wback: function () {
      LV.curChatId = null;
      JFE.closeActiveChat();
      render();
    },
    winfo: function () {
      LV.winfo = !LV.winfo;
      render();
    },
    wmodal: function (el) {
      var v = el.getAttribute('data-v');
      LV.wmodal = v;
      render();
    },
    wclose: function () {
      LV.wmodal = null;
      render();
    },
    wsettings: function (el) {
      LV.wSettingsPage = el.getAttribute('data-v');
      if (LV.wtab !== 'shield') LV.wtab = 'settings';
      render();
    },
    filt: function (el) {
      LV.filter = el.getAttribute('data-v') || 'all';
      render();
    },
    randhandle: function () {
      LV.draftCreate.handle = JCA.randomHandle();
      LV.draftCreate.error = '';
      render();
    },
    pickmask: function (el) {
      LV.draftCreate.mask = el.getAttribute('data-v');
      render();
    },
    signup: async function () {
      if (LV.draftCreate.busy) return;
      var hEl = document.getElementById('cid-handle');
      var nEl = document.getElementById('cid-name');
      if (hEl) LV.draftCreate.handle = hEl.value;
      if (nEl) LV.draftCreate.name = nEl.value;
      var h = JCA.normalizeHandle(LV.draftCreate.handle);
      if (!h || h.length < 4) {
        LV.draftCreate.error = 'Private ID must be at least 3 characters (e.g. @alex.r).';
        render();
        return;
      }
      var phrase = JCA.generatePhrase();
      LV.draftCreate.busy = true;
      LV.draftCreate.error = '';
      render();
      var res = await JFE.createAccount({
        handle: h,
        name: LV.draftCreate.name || h.replace(/^@/, ''),
        phrase: phrase
      });
      LV.draftCreate.busy = false;
      if (res.error) {
        LV.draftCreate.error = res.message || 'Could not create private ID.';
        render();
        return;
      }
      LV.settings.phrase = res.phrase;
      LV.save();
      if (LV.pendingInviteToken) {
        await claimPendingInvite();
      }
      go('secure-device', 'push');
    },
    rtab: function (el) {
      LV.draftRestore.tab = el.getAttribute('data-v');
      LV.draftRestore.error = '';
      render();
    },
    dorestore: async function () {
      if (LV.draftRestore.busy) return;
      var r = LV.draftRestore;
      if (r.tab === 'phrase') {
        var rh = document.getElementById('res-handle');
        var rp = document.getElementById('res-phrase');
        if (rh) r.handle = rh.value;
        if (rp) r.phrase = rp.value;
      } else {
        var rc = document.getElementById('res-code');
        if (rc) r.code = rc.value;
      }
      r.busy = true;
      r.error = '';
      render();
      var res = r.tab === 'phrase'
        ? await JFE.restoreAccount(r.handle, r.phrase)
        : await JFE.claimPairingCode(r.code);
      r.busy = false;
      if (res.error) {
        r.error = res.message || 'Sign in failed';
        render();
        return;
      }
      LV.settings.phrase = res.phrase || LV.settings.phrase;
      LV.settings.onboarded = true;
      LV.save();
      if (LV.pendingInviteToken) await claimPendingInvite();
      go('chats', 'push');
      toast('Signed in as ' + (res.profile && res.profile.handle));
    },
    savepins: function () {
      var p1 = document.getElementById('sec-pin');
      var p2 = document.getElementById('sec-dpin');
      var pin = p1 ? p1.value.replace(/\D/g, '').slice(0, 4) : '';
      var dpin = p2 ? p2.value.replace(/\D/g, '').slice(0, 4) : '';
      if (pin && pin.length !== 4) { toast('Real PIN must be 4 digits'); return; }
      if (dpin && dpin.length !== 4) { toast('Duress PIN must be 4 digits'); return; }
      if (pin && dpin && pin === dpin) { toast('Duress PIN must differ from real PIN'); return; }
      LV.settings.lockPin = pin;
      LV.settings.duressPin = dpin;
      LV.settings.vaultPin = pin || '2468';
      LV.settings.appLock = !!pin;
      LV.save();
      go('recovery-phrase', 'push');
    },
    copyphrase: function () {
      var text = (LV.settings.phrase || []).join(' ');
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(function () {});
      LV.settings.phraseBackedUp = true;
      LV.save();
      toast('12-word phrase copied');
    },
    backedup: function () {
      LV.settings.phraseBackedUp = true;
      LV.save();
      go('permissions', 'push');
    },
    reqnotif: function () {
      if (global.Notification && Notification.requestPermission) {
        Notification.requestPermission().then(function (res) {
          toast('Web Notification: ' + res);
        }).catch(function () {});
      }
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var LocalNotifs = Plugins && (Plugins.LocalNotifications || (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications));
      if (LocalNotifs && LocalNotifs.requestPermissions) {
        LocalNotifs.requestPermissions().then(function (res) {
          toast('Device Notification permission updated');
        }).catch(function () {});
      } else {
        toast('Notification configured');
      }
    },
    reqmedia: function () {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          s.getTracks().forEach(function (t) { t.stop(); });
          toast('Microphone ready');
        }).catch(function () { toast('Permission skipped'); });
      }
    },
    enterapp: function () {
      LV.settings.onboarded = true;
      LV.save();
      go('chats', 'push');
    },
    lookupid: async function () {
      var inp = document.getElementById('add-handle');
      if (inp) LV.draftAdd.handle = inp.value;
      var q = JCA.normalizeHandle(LV.draftAdd.handle);
      if (!q) { LV.draftAdd.error = 'Enter a @private-id'; LV.draftAdd.result = null; render(); return; }
      LV.draftAdd.searching = true;
      LV.draftAdd.error = '';
      render();
      try {
        var peer = await JFE.lookupHandle(q);
        LV.draftAdd.searching = false;
        if (!peer) {
          LV.draftAdd.result = null;
          LV.draftAdd.error = 'No user registered at ' + q;
        } else if (peer.uid === JFE.uid) {
          LV.draftAdd.result = null;
          LV.draftAdd.error = 'That is your own handle';
        } else {
          LV.draftAdd.result = peer;
        }
      } catch (err) {
        LV.draftAdd.searching = false;
        LV.draftAdd.error = err.message || 'Lookup failed';
      }
      render();
    },
    addandchat: async function () {
      var peer = LV.draftAdd.result;
      if (!peer) return;
      var chatId = await JFE.startDmWith(peer);
      LV.draftAdd = { handle: '', result: null, error: '', searching: false };
      LV.curChatId = chatId;
      LV.wmodal = null;
      JFE.openChat(chatId);
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'push');
    },
    lookupandchat: async function (el) {
      var h = el.getAttribute('data-h');
      var peer = await JFE.lookupHandle(h);
      if (!peer || peer.uid === JFE.uid) { toast('Contact unavailable'); return; }
      var chatId = await JFE.startDmWith(peer);
      LV.curChatId = chatId;
      LV.wmodal = null;
      JFE.openChat(chatId);
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'push');
    },
    startchat: async function (el) {
      var uid = el.getAttribute('data-uid');
      var existing = JCS.knownContacts().find(function (c) { return c.uid === uid; });
      if (!existing) return;
      LV.curChatId = existing.chatId;
      LV.wmodal = null;
      JFE.openChat(existing.chatId);
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'push');
    },
    gsel: function (el) {
      var uid = el.getAttribute('data-uid');
      if (LV.draftGroup.picked[uid]) delete LV.draftGroup.picked[uid];
      else LV.draftGroup.picked[uid] = true;
      render();
    },
    gcreate: async function () {
      var inp = document.getElementById('grp-name');
      if (inp) LV.draftGroup.name = inp.value;
      var pickedUids = Object.keys(LV.draftGroup.picked);
      if (!LV.draftGroup.name.trim()) { toast('Enter a group name'); return; }
      var contacts = JCS.knownContacts().filter(function (c) { return !!LV.draftGroup.picked[c.uid]; });
      var chatId = await JFE.createGroup(LV.draftGroup.name.trim(), contacts);
      LV.draftGroup = { name: '', picked: {} };
      LV.curChatId = chatId;
      LV.wmodal = null;
      JFE.openChat(chatId);
      if (isDesktopShellRoute()) render(true);
      else go('chat-group', 'push');
    },
    openweb: function () {
      try { global.history.pushState(null, '', '/web'); } catch (e) {}
      if (LV.settings.onboarded && JFE.uid) {
        go('chats', 'push');
      } else {
        go('welcome-1', 'push');
      }
    },
    gohome: function () {
      try { global.history.pushState(null, '', '/'); } catch (e) {}
      go('landing', 'pop');
    },
    openlegal: function (el) {
      var doc = (el && el.getAttribute('data-v')) || 'privacy';
      LV.legalModal = doc;
      if (LV.route !== 'landing') {
        go('privacy-policy', 'push');
      } else {
        render();
      }
    },
    closelegal: function () {
      LV.legalModal = null;
      if (LV.route === 'privacy-policy' || LV.route === 'terms-of-service' || LV.route === 'security-whitepaper' || LV.route === 'warrant-canary') {
        go('landing', 'pop');
      } else {
        render();
      }
    },
    dlapk: function () {
      toast('Downloading JChatt Android APK (v2.0)...');
    },
    send: async function () {
      var inp = document.getElementById('chat-input');
      var txt = (inp ? inp.value : global.JCHATT_DRAFT || '').trim();
      if (!txt) {
        if (isDesktopShellRoute()) { LV.wmodal = 'voice-record'; render(); }
        else go('voice-record', 'push');
        return;
      }
      if (!LV.curChatId) return;
      if (inp) inp.value = '';
      global.JCHATT_DRAFT = '';
      var sBtn = document.getElementById('send-btn');
      if (sBtn) { sBtn.classList.remove('lime'); sBtn.innerHTML = I('mic', 20); }
      var replyPayload = LV.replyTo ? { id: LV.replyTo.id, text: LV.replyTo.text, from: LV.replyTo.from } : null;
      LV.replyTo = null;
      if (global.JCSOUND) global.JCSOUND.playMsgSent();
      try {
        await JFE.sendMessage(LV.curChatId, { kind: 'text', text: txt, replyTo: replyPayload });
      } catch (e) { toast(e.message || 'Send failed'); }
      render(true);
    },
    cancelreply: function () { LV.replyTo = null; render(); },
    openattach: function () {
      if (isDesktopShellRoute()) { LV.wmodal = 'attach-sheet'; render(); }
      else go('attach-sheet', '');
    },
    opentimer: function () {
      if (isDesktopShellRoute()) { LV.wmodal = 'timer-sheet'; render(); }
      else go('timer-sheet', '');
    },
    openstickers: function () {
      if (isDesktopShellRoute()) { LV.wmodal = 'stickers'; render(); }
      else go('stickers', '');
    },
    openpoll: function () {
      if (isDesktopShellRoute()) { LV.wmodal = 'poll-create'; render(); }
      else go('poll-create', '');
    },
    aisum: function () {
      LV.wmodal = 'ai-summary';
      render();
    },
    settimer: function (el) {
      var v = el.getAttribute('data-v') || 'off';
      if (JFE.chats && JFE.chats[LV.curChatId]) JFE.chats[LV.curChatId].timer = v;
      LV.wmodal = null;
      toast('Disappearing timer: ' + v);
      if (isDesktopShellRoute()) render();
      else go('chat', '');
      JFE.updateChatMeta(LV.curChatId, { timer: v }).catch(function () {});
    },
    sendsticker: async function (el) {
      var url = el.getAttribute('data-url');
      if (!url || !LV.curChatId) return;
      LV.wmodal = null;
      await JFE.sendMessage(LV.curChatId, { kind: 'sticker', stickerUrl: url });
      if (isDesktopShellRoute()) render(true);
      else go('chat', '');
    },
    sendpoll: async function () {
      var qEl = document.getElementById('poll-q');
      if (qEl) LV.draftPoll.q = qEl.value;
      var opts = [];
      document.querySelectorAll('.poll-opt').forEach(function (el) {
        if (el.value.trim()) opts.push(el.value.trim());
      });
      if (!LV.draftPoll.q.trim() || opts.length < 2) {
        toast('Enter a question and at least 2 options');
        return;
      }
      await JFE.sendMessage(LV.curChatId, { kind: 'poll', poll: { q: LV.draftPoll.q.trim(), opts: opts, votes: {} } });
      LV.draftPoll = { q: '', opts: ['', '', ''] };
      LV.wmodal = null;
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'pop');
    },
    vote: async function (el) {
      var mid = el.getAttribute('data-mid');
      var idx = parseInt(el.getAttribute('data-v'), 10);
      await JFE.votePoll(LV.curChatId, mid, idx);
    },
    pickphoto: function () {
      viewOncePending = false;
      photoTargetMode = 'chat';
      var fi = document.getElementById('file-photo');
      if (fi) { fi.value = ''; fi.click(); }
    },
    pickviewonce: function () {
      viewOncePending = true;
      photoTargetMode = 'chat';
      var fi = document.getElementById('file-photo');
      if (fi) { fi.value = ''; fi.click(); }
    },
    pickstphoto: function () {
      photoTargetMode = 'status';
      var fi = document.getElementById('file-photo');
      if (fi) { fi.value = ''; fi.click(); }
    },
    openphoto: function (el) {
      var id = el.getAttribute('data-id');
      var msg = (JFE.messagesByChat[LV.curChatId] || {})[id];
      if (!msg) return;
      LV.viewingPhoto = msg;
      if (msg.viewOnce && msg.from !== JFE.uid) JFE.markViewOnceOpened(LV.curChatId, id);
      if (isDesktopShellRoute()) { LV.wmodal = 'photo-view'; render(); }
      else go('photo-view', 'push');
    },
    sendloc: async function () {
      LV.wmodal = null;
      await JFE.sendMessage(LV.curChatId, { kind: 'loc', loc: { label: 'Shared Pin', approx: 'Approximate (+/- 500m privacy fuzzy)' } });
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'pop');
    },
    pickdoc: function () {
      var fd = document.getElementById('file-doc');
      if (fd) { fd.value = ''; fd.click(); }
    },
    opendoc: function (el) {
      var id = el.getAttribute('data-id');
      var msg = (JFE.messagesByChat[LV.curChatId] || {})[id];
      if (!msg || !msg.doc) return;
      LV.viewingDoc = msg.doc;
      go('doc-viewer', 'push');
    },
    voicestart: async function () {
      if (LV.voiceRecording) return;
      LV.voiceRecording = true;
      LV.voiceSeconds = 0;
      voiceChunks = [];
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
          var s = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRec = new MediaRecorder(s);
          mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) voiceChunks.push(ev.data); };
          mediaRec.start();
        }
      } catch (e) { mediaRec = null; }
      clearInterval(voiceTimer);
      voiceTimer = setInterval(function () {
        LV.voiceSeconds++;
        render();
      }, 1000);
      render();
    },
    voicestopsend: function () {
      if (!LV.voiceRecording) return;
      LV.voiceRecording = false;
      clearInterval(voiceTimer);
      var sec = Math.max(1, LV.voiceSeconds);
      LV.voiceSeconds = 0;
      function finishSend(audioData) {
        JFE.sendMessage(LV.curChatId, { kind: 'voice', audioData: audioData || '', audioSec: sec });
        LV.wmodal = null;
        if (isDesktopShellRoute()) render(true);
        else go('chat', 'pop');
      }
      if (mediaRec && mediaRec.state !== 'inactive') {
        mediaRec.onstop = function () {
          try { mediaRec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          var blob = new Blob(voiceChunks, { type: 'audio/webm' });
          var fr = new FileReader();
          fr.onloadend = function () { finishSend(fr.result); };
          fr.readAsDataURL(blob);
          mediaRec = null;
        };
        mediaRec.stop();
      } else {
        finishSend('');
      }
    },
    playvoice: function (el) {
      var id = el.getAttribute('data-id');
      var msg = (JFE.messagesByChat[LV.curChatId] || {})[id];
      if (msg && msg.audioData) {
        if (audioPlayer) audioPlayer.pause();
        audioPlayer = new Audio(msg.audioData);
        audioPlayer.play().catch(function () { toast('Playing voice waveform (' + (msg.audioSec || 3) + 's)'); });
      } else {
        toast('Voice message (' + ((msg && msg.audioSec) || 3) + 's)');
      }
    },
    msel: function (el) {
      LV.selMsgId = el.getAttribute('data-id');
      if (isDesktopShellRoute()) { LV.wmodal = 'msg-actions'; render(); }
      else go('msg-actions', 'push');
    },
    react: async function (el) {
      var em = el.getAttribute('data-v');
      await JFE.toggleReaction(LV.curChatId, LV.selMsgId, em);
      LV.wmodal = null;
      if (isDesktopShellRoute()) render();
      else go('chat', 'pop');
    },
    mreply: function () {
      var m = (JFE.messagesByChat[LV.curChatId] || {})[LV.selMsgId];
      if (m) LV.replyTo = m;
      LV.wmodal = null;
      if (isDesktopShellRoute()) render();
      else go('chat', 'pop');
    },
    mfwd: function () {
      if (isDesktopShellRoute()) { LV.wmodal = 'forward-picker'; render(); }
      else go('forward-picker', 'push');
    },
    fwdto: async function (el) {
      var destId = el.getAttribute('data-id');
      var m = (JFE.messagesByChat[LV.curChatId] || {})[LV.selMsgId];
      if (!m || !destId) return;
      await JFE.sendMessage(destId, { kind: m.kind, text: m.text, imgData: m.imgData, stickerUrl: m.stickerUrl });
      LV.curChatId = destId;
      LV.wmodal = null;
      JFE.openChat(destId);
      toast('Forwarded');
      if (isDesktopShellRoute()) render(true);
      else go('chat', 'push');
    },
    mstar: function () {
      var id = LV.selMsgId;
      if (LV.settings.starredIds[id]) delete LV.settings.starredIds[id];
      else LV.settings.starredIds[id] = true;
      LV.save();
      LV.wmodal = null;
      toast(LV.settings.starredIds[id] ? 'Starred' : 'Unstarred');
      if (isDesktopShellRoute()) render();
      else go('chat', 'pop');
    },
    mcopy: function () {
      var m = (JFE.messagesByChat[LV.curChatId] || {})[LV.selMsgId];
      if (m && m.text && navigator.clipboard) navigator.clipboard.writeText(m.text).catch(function () {});
      LV.wmodal = null;
      toast('Copied');
      if (isDesktopShellRoute()) render();
      else go('chat', 'pop');
    },
    mdel: async function (el) {
      var forAll = el.getAttribute('data-all') === '1';
      await JFE.deleteMessage(LV.curChatId, LV.selMsgId, forAll);
      LV.wmodal = null;
      if (isDesktopShellRoute()) render();
      else go('chat', 'pop');
    },
    pinchat: async function () {
      var c = JFE.chats[LV.curChatId];
      if (!c) return;
      await JFE.updateChatMeta(c.id, { pinned: !c.pinned });
      toast(c.pinned ? 'Unpinned' : 'Pinned to top');
      render();
    },
    archchat: async function () {
      var c = JFE.chats[LV.curChatId];
      if (!c) return;
      await JFE.updateChatMeta(c.id, { archived: !c.archived });
      toast(c.archived ? 'Restored to inbox' : 'Archived');
      if (!c.archived && !isDesktopShellRoute()) go('chats', 'pop');
      else render();
    },
    unarch: async function (el) {
      var id = el.getAttribute('data-id');
      await JFE.updateChatMeta(id, { archived: false });
      render();
    },
    mute: async function (el) {
      var v = el.getAttribute('data-v') === '1';
      await JFE.updateChatMeta(LV.curChatId, { muted: v });
      toast(v ? 'Muted' : 'Unmuted');
      if (!isDesktopShellRoute()) go('chat-info', 'pop');
      else render();
    },
    lockchat: function () {
      var id = LV.curChatId;
      if (LV.settings.vaultChatIds[id]) delete LV.settings.vaultChatIds[id];
      else LV.settings.vaultChatIds[id] = true;
      LV.save();
      toast(LV.settings.vaultChatIds[id] ? 'Moved to Hidden Vault' : 'Removed from Vault');
      render();
    },
    blockchat: async function () {
      var c = JFE.chats[LV.curChatId];
      if (!c || !c.peerUid) return;
      var cur = !!JFE.blocked[c.peerUid];
      await JFE.setBlocked(c.peerUid, !cur);
      toast(cur ? 'Contact unblocked' : 'Contact blocked');
      if (!isDesktopShellRoute()) go('chat-info', 'pop');
      else render();
    },
    unblock: async function (el) {
      await JFE.setBlocked(el.getAttribute('data-uid'), false);
      toast('Unblocked');
      render();
    },
    clrchat: async function () {
      await JFE.clearChatMessages(LV.curChatId);
      toast('Thread cleared');
      if (!isDesktopShellRoute()) go('chat', 'pop');
      else render();
    },
    delchat: async function () {
      await JFE.deleteChatForMe(LV.curChatId);
      LV.curChatId = null;
      toast('Conversation removed');
      if (isDesktopShellRoute()) render();
      else go('chats', 'pop');
    },
    stcol: function (el) { LV.draftStatus.bg = el.getAttribute('data-v'); render(); },
    poststatus: async function () {
      var tx = document.getElementById('st-text');
      if (tx) LV.draftStatus.text = tx.value;
      if (!LV.draftStatus.text.trim() && !LV.draftStatus.imgData) {
        toast('Add text or an image first');
        return;
      }
      await JFE.postStatus(LV.draftStatus.text.trim(), LV.draftStatus.bg, LV.draftStatus.imgData);
      LV.draftStatus = { text: '', bg: '#0a2230', imgData: null };
      LV.wmodal = null;
      toast('Status shared');
      if (isDesktopShellRoute()) render();
      else go('updates', 'pop');
    },
    viewst: function (el) {
      var sid = el.getAttribute('data-id');
      LV.viewingStatusId = sid;
      JFE.markStatusViewed(sid);
      if (isDesktopShellRoute()) { LV.wmodal = 'status-view'; render(); }
      else go('status-view', 'push');
    },
    callto: async function (el) {
      var uid = el.getAttribute('data-uid');
      var video = el.getAttribute('data-v') === '1';
      var contact = JCS.knownContacts().find(function (c) { return c.uid === uid; }) || { uid: uid, name: 'Contact' };
      if (global.JCSOUND) global.JCSOUND.playRingback();
      await JFE.startCall(contact, video);
      if (!isDesktopShellRoute()) go(video ? 'call-video' : 'call-voice', 'push');
      else render();
    },
    answercall: async function () {
      if (!JFE.incomingCall) return;
      var video = !!JFE.incomingCall.video;
      if (global.JCSOUND) {
        global.JCSOUND.stopAll();
        global.JCSOUND.playCallConnected();
      }
      await JFE.answerCall(JFE.incomingCall);
      LV.wmodal = null;
      if (!isDesktopShellRoute()) go(video ? 'call-video' : 'call-voice', 'push');
      else render();
    },
    declinecall: async function () {
      if (global.JCSOUND) {
        global.JCSOUND.stopAll();
        global.JCSOUND.playCallEnded();
      }
      if (JFE.incomingCall) await JFE.declineCall(JFE.incomingCall);
      LV.wmodal = null;
      render();
    },
    endcall: async function () {
      if (global.JCSOUND) {
        global.JCSOUND.stopAll();
        global.JCSOUND.playCallEnded();
      }
      var call = JFE.activeCall;
      LV.lastCallSummary = call ? {
        name: call.peer && (call.peer.name || call.peer.handle),
        durSec: call.connectedAt ? Math.max(1, Math.round((Date.now() - call.connectedAt) / 1000)) : 0
      } : null;
      await JFE.endCall(false);
      if (!isDesktopShellRoute()) go('call-ended', 'push');
      else { toast('Call ended'); render(); }
    },
    callmute: function () { JFE.toggleCallMute(); render(); },
    mkinvite: async function () {
      try {
        var res = await JFE.createInviteLink(true);
        LV.currentInviteUrl = res.url;
        if (navigator.clipboard) navigator.clipboard.writeText(res.url).catch(function () {});
        toast('One-time invite copied');
        render();
      } catch (e) { toast(e.message || 'Sign in first'); }
    },
    mkqr: function () { ACT.mkinvite(); },
    claiminput: async function () {
      var el = document.getElementById('qr-paste');
      var raw = el ? el.value.trim() : '';
      if (!raw) { toast('Paste an invite link or @handle'); return; }
      var m = raw.match(/invite=([^&\s]+)/);
      if (m) {
        var res = await JFE.claimInvite(decodeURIComponent(m[1]));
        if (res.ok) {
          LV.curChatId = res.chatId;
          LV.wmodal = null;
          JFE.openChat(res.chatId);
          toast('Connected!');
          if (isDesktopShellRoute()) render(true); else go('chat', 'push');
        } else {
          toast(res.message || 'Invite invalid');
        }
      } else {
        LV.draftAdd.handle = raw;
        await ACT.lookupid();
        if (LV.draftAdd.result) await ACT.addandchat();
        else toast(LV.draftAdd.error || 'User not found');
      }
    },
    mkpair: async function () {
      try {
        var res = await JFE.createPairingCode(LV.settings.phrase || []);
        LV.activePairCode = res;
        toast('Device code ready');
        render();
      } catch (e) { toast(e.message || 'Need recovery phrase locally'); }
    },
    key: function (el) {
      var mode = el.getAttribute('data-m');
      var v = el.getAttribute('data-v');
      if (v === 'clr') LV.pinBuffer = '';
      else if (v === 'del') LV.pinBuffer = LV.pinBuffer.slice(0, -1);
      else if (LV.pinBuffer.length < 4) LV.pinBuffer += v;
      LV.pinError = '';
      if (LV.pinBuffer.length === 4) {
        var entered = LV.pinBuffer;
        LV.pinBuffer = '';
        if (LV.settings.duressPin && entered === LV.settings.duressPin) {
          LV.duressMode = true;
          LV.locked = false;
          go('duress-decoy', 'push');
          return;
        }
        if (mode === 'vault') {
          if (!LV.settings.vaultPin || entered === LV.settings.vaultPin || entered === LV.settings.lockPin) {
            LV.vaultUnlocked = true;
            go('vault', 'push');
          } else {
            LV.pinError = 'Wrong vault PIN';
            render();
          }
          return;
        }
        if (!LV.settings.lockPin || entered === LV.settings.lockPin) {
          LV.locked = false;
          go('chats', 'push');
        } else {
          LV.pinError = 'Incorrect PIN';
          render();
        }
        return;
      }
      render();
    },
    locknow: function () { LV.locked = true; go('lockscreen', 'push'); if (LV.settings.biometric) setTimeout(tryBiometricUnlock, 350); },
    lockvault: function () { LV.vaultUnlocked = false; go('shield', 'pop'); },
    opendecoy: function (el) { LV.activeDecoyId = el.getAttribute('data-id'); render(); },
    closeDecoy: function () { LV.activeDecoyId = null; render(); },
    decoysend: function () {
      var inp = document.getElementById('decoy-in');
      var dc = JCS.DURESS_CHATS.find(function (c) { return c.id === LV.activeDecoyId; });
      if (dc && inp && inp.value.trim()) {
        dc.msgs.push({ from: 'me', text: inp.value.trim(), time: 'Just now' });
        dc.lastText = inp.value.trim();
        inp.value = '';
        render();
      }
    },
    exitduress: function () { LV.duressMode = false; LV.locked = true; go('lockscreen', 'pop'); },
    dsel: function (el) {
      var v = el.getAttribute('data-v');
      LV.settings.disguise = v;
      LV.save();
      toast('Disguise set: ' + v);
      render();
    },
    nsel: function (el) {
      LV.settings.notifPreset = el.getAttribute('data-v');
      LV.save();
      toast('Notification disguise saved');
      render();
    },
    calc: function (el) {
      var k = el.getAttribute('data-v');
      if (k === 'C') {
        LV.calcDisplay = '0'; LV.calcAcc = null; LV.calcOp = null; LV.calcReset = false;
      } else if (k === '+/-') {
        LV.calcDisplay = String(-(parseFloat(LV.calcDisplay) || 0));
      } else if (k === '%') {
        LV.calcDisplay = String((parseFloat(LV.calcDisplay) || 0) / 100);
      } else if ('+-*/'.indexOf(k) >= 0) {
        LV.calcAcc = parseFloat(LV.calcDisplay) || 0;
        LV.calcOp = k;
        LV.calcReset = true;
      } else if (k === '=') {
        if (LV.calcDisplay === '314159') {
          LV.calcDisplay = '0';
          toast('JChatt unlocked');
          go('chats', 'push');
          return;
        }
        var cur = parseFloat(LV.calcDisplay) || 0;
        if (LV.calcOp && LV.calcAcc !== null) {
          if (LV.calcOp === '+') cur = LV.calcAcc + cur;
          if (LV.calcOp === '-') cur = LV.calcAcc - cur;
          if (LV.calcOp === '*') cur = LV.calcAcc * cur;
          if (LV.calcOp === '/') cur = cur === 0 ? 0 : LV.calcAcc / cur;
        }
        LV.calcDisplay = String(Number(cur.toFixed(6)));
        LV.calcOp = null;
        LV.calcAcc = null;
        LV.calcReset = true;
      } else {
        if (LV.calcReset || LV.calcDisplay === '0') {
          LV.calcDisplay = k === '.' ? '0.' : k;
          LV.calcReset = false;
        } else if (!(k === '.' && LV.calcDisplay.indexOf('.') >= 0)) {
          LV.calcDisplay += k;
        }
      }
      render();
    },
    unlocktap: function () {
      unlockTapCount++;
      clearTimeout(unlockTapReset);
      unlockTapReset = setTimeout(function () { unlockTapCount = 0; }, 1200);
      if (unlockTapCount >= 2) {
        unlockTapCount = 0;
        toast('JChatt unlocked');
        go('chats', 'push');
      }
    },
    tg: function (el) {
      var k = el.getAttribute('data-k');
      LV.settings[k] = !LV.settings[k];
      if (k === 'biometric' && LV.settings.biometric) {
        LV.settings.appLock = true;
        tryBiometricUnlock();
      }
      LV.save();
      applyRootTheme();
      render();
    },
    theme3: function (el) {
      LV.settings.theme = el.getAttribute('data-v');
      LV.save();
      render();
    },
    setav: function (el) {
      var url = el.getAttribute('data-v');
      JFE.updateProfile({ avatar: url });
      render();
    },
    saveprof: async function () {
      var n = document.getElementById('prof-name');
      var b = document.getElementById('prof-bio');
      await JFE.updateProfile({
        name: n ? n.value.trim() : (JFE.me && JFE.me.name),
        bio: b ? b.value.trim() : (JFE.me && JFE.me.bio)
      });
      toast('Profile saved');
      if (!isDesktopShellRoute()) go('settings', 'pop');
      else render();
    },
    addmask: async function () {
      var me = JFE.me || {};
      var list = (me.masks || []).slice();
      list.push({ id: 'm_' + Date.now().toString(36), name: 'Alt Mask ' + (list.length + 1), handle: me.handle, bio: 'Low profile', active: false });
      await JFE.updateProfile({ masks: list });
      toast('Mask added');
      render();
    },
    usemask: async function (el) {
      var id = el.getAttribute('data-id');
      var me = JFE.me || {};
      var list = (me.masks || []).map(function (m) { return Object.assign({}, m, { active: m.id === id }); });
      var chosen = list.find(function (m) { return m.id === id; });
      await JFE.updateProfile({ masks: list, name: chosen ? chosen.name : me.name, bio: chosen ? chosen.bio : me.bio });
      toast('Active mask switched');
      render();
    },
    exportjson: function () {
      var blob = new Blob([JSON.stringify({ me: JFE.me, chats: JFE.chats, settings: LV.settings }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'jchatt-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      toast('Backup exported');
    },
    dologout: async function () {
      await JFE.logout();
      LV.curChatId = null;
      LV.wmodal = null;
      go('welcome-1', 'pop');
    },
    doburn: async function () {
      await JFE.burnAccount();
      LV.resetAllPrefs();
      LV.curChatId = null;
      toast('Account burned');
      go('welcome-1', 'pop');
    },
    paynow: function () {
      var to = (document.getElementById('wal-to') || {}).value || 'Peer';
      var amt = Math.max(1, parseInt((document.getElementById('wal-amt') || {}).value || '0', 10));
      LV.settings.walletBalance = Math.max(0, LV.settings.walletBalance - amt);
      LV.settings.walletHistory.unshift({ to: to, note: 'Sent locally', amt: amt, dir: 'out' });
      LV.save();
      toast('Recorded -' + amt + ' pts');
      go('wallet', 'pop');
    },
    reqmoney: function () {
      var amt = Math.max(1, parseInt((document.getElementById('req-amt') || {}).value || '0', 10));
      LV.settings.walletHistory.unshift({ to: 'Self', note: 'Request created', amt: amt, dir: 'in' });
      LV.save();
      toast('Request recorded');
      go('wallet', 'pop');
    },
    copyrecap: function () {
      var msgs = LV.curChatId ? JFE.getChatMessages(LV.curChatId) : [];
      var txt = msgs.slice(-15).map(function (m) { return (m.fromName || 'Peer') + ': ' + (m.text || m.kind); }).join('\n');
      if (navigator.clipboard && txt) navigator.clipboard.writeText(txt).catch(function () {});
      toast('Recap copied');
    },
    savedom: function (el) {
      var k = el.getAttribute('data-v');
      var tx = document.getElementById('dom-note');
      if (tx) LV.settings.selectedDomainData[k] = tx.value;
      LV.save();
      toast('Saved to local device storage');
    },
    sharedom: async function (el) {
      var k = el.getAttribute('data-v');
      var tx = document.getElementById('dom-note');
      var val = (tx ? tx.value : LV.settings.selectedDomainData[k] || '').trim();
      if (!val || !LV.curChatId) { toast('Write a note first'); return; }
      await JFE.sendMessage(LV.curChatId, { kind: 'text', text: '[' + k + '] ' + val });
      toast('Shared to chat');
      if (isDesktopShellRoute()) { LV.wtab = 'chats'; render(true); }
      else go('chat', 'push');
    },
    setmode: function (el) {
      LV.settings.activeMode = el.getAttribute('data-v');
      LV.save();
      toast('Mode: ' + LV.settings.activeMode);
      render();
    },
    setlang: function (el) {
      LV.settings.language = el.getAttribute('data-v');
      LV.save();
      render();
    },
    clearchatsearch: function () { LV.chatSearchQ = ''; go('chat', 'pop'); },
    toast: function (el) { toast(el.getAttribute('data-m') || 'Done'); }
  };

  async function claimPendingInvite() {
    var tok = LV.pendingInviteToken;
    if (!tok || !JFE.uid) return;
    LV.pendingInviteToken = null;
    LV.pendingInvitePreview = null;
    var res = await JFE.claimInvite(tok);
    if (res && res.ok && res.chatId) {
      LV.curChatId = res.chatId;
      JFE.openChat(res.chatId);
      toast('Connected via invite link!');
      go('chat', 'push');
    }
  }

  function applyRootTheme() {
    document.documentElement.setAttribute('data-theme', LV.settings.darkMode ? 'dark' : 'light');
  }

  // --- Global Delegated Click, Input & File Handlers ---
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act],[data-go],[data-tab],[data-back]');
    if (!el) return;
    if (el.hasAttribute('data-act')) {
      var a = el.getAttribute('data-act');
      if (ACT[a]) ACT[a](el);
    }
    if (el.hasAttribute('data-tab')) {
      go(el.getAttribute('data-tab'), 'tab');
    } else if (el.hasAttribute('data-back')) {
      goBack();
    } else if (el.hasAttribute('data-go')) {
      var target = el.getAttribute('data-go');
      if (target) {
        if (target === 'status-view' && el.getAttribute('data-sid')) {
          LV.viewingStatusId = el.getAttribute('data-sid');
        }
        go(target, 'push');
      }
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (!t) return;
    if (t.id === 'chat-input') {
      global.JCHATT_DRAFT = t.value;
      var sBtn = document.getElementById('send-btn');
      if (sBtn) {
        var hasText = !!t.value.trim();
        sBtn.classList.toggle('lime', hasText);
        sBtn.innerHTML = I(hasText ? 'send' : 'mic', 20);
      }
      if (LV.settings.typingIndicators && LV.curChatId) {
        var now = Date.now();
        if (now - lastTypingPing > 1800) {
          lastTypingPing = now;
          JFE.setTyping(LV.curChatId, !!t.value.trim());
        }
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function () { JFE.setTyping(LV.curChatId, false); }, 2500);
      }
    } else if (t.id === 'glob-search') {
      LV.searchQ = t.value;
      render();
    } else if (t.id === 'chat-q') {
      LV.chatSearchQ = t.value;
    } else if (t.id === 'cid-handle') {
      LV.draftCreate.handle = t.value;
    } else if (t.id === 'cid-name') {
      LV.draftCreate.name = t.value;
    } else if (t.id === 'add-handle') {
      LV.draftAdd.handle = t.value;
    } else if (t.id === 'grp-name') {
      LV.draftGroup.name = t.value;
    } else if (t.id === 'res-handle') {
      LV.draftRestore.handle = t.value;
    } else if (t.id === 'res-phrase') {
      LV.draftRestore.phrase = t.value;
    } else if (t.id === 'res-code') {
      LV.draftRestore.code = t.value;
    } else if (t.id === 'st-text') {
      LV.draftStatus.text = t.value;
    } else if (t.id === 'poll-q') {
      LV.draftPoll.q = t.value;
    } else if (t.classList && t.classList.contains('poll-opt')) {
      var idx = parseInt(t.getAttribute('data-idx'), 10);
      LV.draftPoll.opts[idx] = t.value;
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && document.activeElement && document.activeElement.id === 'chat-input') {
      ev.preventDefault();
      ACT.send();
    } else if (ev.key === 'Enter' && document.activeElement && document.activeElement.id === 'add-handle') {
      ev.preventDefault();
      ACT.lookupid();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      if (isDesktopShellRoute()) { LV.wmodal = 'search'; render(); }
      else if (JFE.uid) go('search', 'push');
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
      ev.preventDefault();
      if (isDesktopShellRoute()) { LV.wmodal = 'add-contact'; render(); }
      else if (JFE.uid) go('add-contact', 'push');
    } else if (ev.key === 'Escape') {
      if (LV.wmodal) { LV.wmodal = null; render(); }
    }
  });

  // Hidden image & file handlers
  document.addEventListener('change', async function (ev) {
    var t = ev.target;
    if (!t || !t.files || !t.files[0]) return;
    var f = t.files[0];
    if (t.id === 'file-photo') {
      try {
        toast('Compressing photo...');
        var dataUrl = await JFE.compressImageFile(f, 720, 0.72);
        if (photoTargetMode === 'status') {
          LV.draftStatus.imgData = dataUrl;
          render();
        } else if (LV.curChatId) {
          LV.wmodal = null;
          await JFE.sendMessage(LV.curChatId, { kind: 'photo', imgData: dataUrl, viewOnce: viewOncePending });
          toast(viewOncePending ? 'View-once photo sent' : 'Photo sent');
          if (isDesktopShellRoute()) render(true);
          else go('chat', 'pop');
        }
      } catch (e) { toast(e.message || 'Image error'); }
    } else if (t.id === 'file-doc') {
      if (LV.curChatId) {
        LV.wmodal = null;
        var kb = Math.max(1, Math.round(f.size / 1024));
        await JFE.sendMessage(LV.curChatId, { kind: 'doc', doc: { name: f.name, size: kb + ' KB' } });
        toast('Document metadata sent');
        if (isDesktopShellRoute()) render(true);
        else go('chat', 'pop');
      }
    }
  });

  // --- Boot Sequence ---
  function decideInitialRoute() {
    if (initialRouted || !authResolved || !splashDone) return;
    initialRouted = true;

    var p = (global.location.pathname || '').toLowerCase();
    var hash = (global.location.hash || '').toLowerCase();
    var sp = new URLSearchParams(global.location.search || '');
    var isNative = !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
    var wantsWeb = isNative || p === '/web' || p.indexOf('/web') === 0 || p === '/app' || hash === '#/web' || sp.has('app') || sp.has('invite') || sp.has('pair');
    var isLegalPrivacy = p === '/privacy' || hash === '#/privacy';
    var isLegalTerms = p === '/terms' || hash === '#/terms';
    var isLegalSecurity = p === '/security' || hash === '#/security';

    if (isLegalPrivacy) { go('privacy-policy', 'tab'); return; }
    if (isLegalTerms) { go('terms-of-service', 'tab'); return; }
    if (isLegalSecurity) { go('security-whitepaper', 'tab'); return; }

    if (!wantsWeb && (p === '/' || p === '' || p === '/index.html')) {
      go('landing', 'tab');
      return;
    }

    if (JFE.uid) {
      LV.settings.onboarded = true;
      LV.save();
      if (LV.pendingInviteToken) {
        claimPendingInvite();
        return;
      }
      if (LV.settings.disguise && LV.settings.disguise !== 'default' && LV.settings.appLock) {
        go(LV.settings.disguise === 'calc' ? 'fake-calc' : 'fake-' + LV.settings.disguise, 'tab');
      } else if (LV.settings.appLock && (LV.settings.lockPin || LV.settings.biometric)) {
        LV.locked = true;
        go('lockscreen', 'tab');
        if (LV.settings.biometric) setTimeout(tryBiometricUnlock, 350);
      } else {
        go('chats', 'tab');
      }
    } else {
      if (LV.pendingPairCode) {
        LV.draftRestore = { tab: 'code', code: LV.pendingPairCode, handle: '', phrase: '', error: '', busy: false };
        go('restore-account', 'tab');
      } else {
        go('welcome-1', 'tab');
      }
    }
  }

  function boot() {
    applyRootTheme();
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var AppPlugin = Plugins && (Plugins.App || (Cap && Cap.Plugins && Cap.Plugins.App));
      if (AppPlugin && AppPlugin.addListener) {
        AppPlugin.addListener('backButton', function () {
          if (LV.wmodal) {
            LV.wmodal = null;
            render();
            return;
          }
          if (LV.mediaViewer || LV.attachDrawer) {
            LV.mediaViewer = null;
            LV.attachDrawer = false;
            render();
            return;
          }
          if (LV.curChatId || LV.route === 'chat') {
            go('inbox', 'pop');
            return;
          }
          if (LV.route !== 'inbox' && LV.route !== 'landing' && LV.route !== 'splash' && LV.route !== 'welcome') {
            go('inbox', 'pop');
            return;
          }
          if (AppPlugin.exitApp) AppPlugin.exitApp();
        });
        AppPlugin.addListener('appStateChange', function (state) {
          if (!state.isActive) {
            if (LV.settings.appLock || LV.settings.biometric) {
              LV.locked = true;
            }
          } else {
            if (LV.locked && (LV.settings.appLock || LV.settings.biometric)) {
              go('lockscreen', 'tab');
              if (LV.settings.biometric) setTimeout(tryBiometricUnlock, 350);
            }
          }
        });
      }
    } catch (e) {}

    try {
      document.addEventListener('click', function () {
        if (global.Notification && Notification.permission === 'default' && Notification.requestPermission) {
          Notification.requestPermission().catch(function () {});
        }
      }, { once: true });
    } catch (e) {}
    try {
      if (global.JCSOUND) {
        if (global.JCSOUND.ensureNotificationChannel) global.JCSOUND.ensureNotificationChannel();
        if (global.JCSOUND.startForegroundKeepalive) global.JCSOUND.startForegroundKeepalive();
      }
    } catch (e) {}
    try {
      var sp = new URLSearchParams(global.location.search || '');
      var inv = sp.get('invite');
      var pair = sp.get('pair');
      if (inv) {
        LV.pendingInviteToken = inv;
        JFE.peekInvite(inv).then(function (p) {
          if (p) { LV.pendingInvitePreview = p; render(); }
        }).catch(function () {});
      }
      if (pair) LV.pendingPairCode = pair;
    } catch (e) {}

    render();

    var resizeTimer = null;
    global.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    });

    var renderRaf = null;
    JFE.onChange(function (reason) {
      if (reason === 'incoming_call' && JFE.incomingCall && !isDesktopShellRoute() && LV.route !== 'incoming-call') {
        go('incoming-call', 'push');
        return;
      }
      if ((PHONE_ONLY_ROUTES[LV.route] || !LV.settings.onboarded) && LV.route !== 'splash') return;
      if (reason === 'statuses' && LV.route !== 'updates' && LV.wtab !== 'updates') return;
      if (reason === 'calls' && LV.route !== 'calls' && LV.wtab !== 'calls') return;

      // Fast surgical patch for active conversation stream (never tears down composer or bottom sheet!)
      if ((reason === 'messages' || reason === 'typing' || reason === 'vanish') && LV.curChatId) {
        var msgEl = document.getElementById('chat-msgs');
        if (msgEl) {
          var atBottom = msgEl.scrollHeight - msgEl.scrollTop - msgEl.clientHeight < 80;
          msgEl.innerHTML = JCS.renderMessagesList(LV.curChatId);
          if (atBottom) msgEl.scrollTop = msgEl.scrollHeight;
          lastRenderedHtml = '';
          return;
        }
      }

      if (LV.wmodal || MODAL_ROUTES[LV.route]) return;
      var ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) {
        // While user is focused in ANY input (including chat-input), NEVER replace the DOM tree!
        // Prevents keystroke loss, focus jumping, and UI lag.
        return;
      }

      if (reason === 'incoming_call' && JFE.incomingCall && global.JCSOUND) {
        global.JCSOUND.playIncomingCall();
        global.JCSOUND.sendNotification('Incoming Call · ' + (JFE.incomingCall.fromName || JFE.incomingCall.fromHandle), 'Tap to answer encrypted call');
      }

      if (reason === 'messages') {
        if (LV.settings.soundEffects && global.JCSOUND) global.JCSOUND.playMsgReceived();
      }

      cancelAnimationFrame(renderRaf);
      renderRaf = requestAnimationFrame(function () { render(false); });
    });

    setTimeout(function () {
      splashDone = true;
      decideInitialRoute();
    }, 650);

    JFE.watchAuth(async function (user) {
      if (user) {
        await JFE.ensureProfile(user.uid).catch(function () {});
      }
      authResolved = true;
      decideInitialRoute();
    });
  }

  global.JCHATT = {
    go: go,
    toast: toast,
    render: render,
    LV: LV,
    ACT: ACT
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
