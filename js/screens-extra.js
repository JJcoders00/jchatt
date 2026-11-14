/* ===== JCHATT v2 SECURITY, STEALTH, SETTINGS, MINI-APPS & EXTRA SCREENS ===== */
(function (global) {
  'use strict';

  function initExtraScreens() {
    var JCS = global.JCS;
    var JCA = global.JCA;
    var JFE = global.JFE;
    var LV = JCS.LV;
    var SCREENS = JCS.SCREENS;
    var E = JCA.escHtml;
    var I = JCA.ic;
    var av = JCS.av;
    var rb = JCS.rb;
    var backBtn = JCS.backBtn;
    var hdr = JCS.hdr;
    var btn = JCS.btn;
    var ico = JCS.ico;
    var togRow = JCS.togRow;
    var row = JCS.row;
    var emptyP = JCS.emptyP;
    var skList = JCS.skList;
    var fmtTime = JCS.fmtTime;

    function add(name, fn) { SCREENS[name] = fn; }

    function pinPad(title, sub, mode, backTo) {
      var len = (LV.pinBuffer || '').length;
      var dots = [0, 1, 2, 3].map(function (i) {
        return '<i class="' + (i < len ? 'f' : '') + '"></i>';
      }).join('');
      var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
      var bioBtn = (mode === 'app' || LV.settings.biometric)
        ? '<button class="btn" style="margin-top:16px;background:#00a884;color:#fff;border-radius:24px;box-shadow:0 3px 0 #075e54;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700" data-act="dobioauth">'
          + I('fingerprint', 20) + ' Touch Fingerprint Sensor'
          + '</button>'
        : '';
      return '<div class="scr" style="background:var(--ink);color:#fff">'
        + hdr(title, sub, backTo ? backBtn(backTo) : '', '')
        + '<div style="flex:1;display:grid;place-content:center;gap:14px;padding:18px;text-align:center">'
        + JCA.mascot('secret', 76)
        + '<div class="pin">' + dots + '</div>'
        + (LV.pinError ? '<div class="err-inline">' + E(LV.pinError) + '</div>' : '<p class="mute" style="font-size:12px">Enter 4 digits or use fingerprint</p>')
        + '<div class="keys">'
        + keys.map(function (k) {
          if (k === 'back') return '<button data-act="key" data-m="' + mode + '" data-v="del">' + I('back', 18) + '</button>';
          if (k === 'ok') return '<button data-act="key" data-m="' + mode + '" data-v="clr" style="font-size:12px">CLR</button>';
          return '<button data-act="key" data-m="' + mode + '" data-v="' + k + '">' + k + '</button>';
        }).join('')
        + '</div>'
        + bioBtn
        + '</div></div>';
    }

    // --- 1. Lockscreen, Vault & Duress Decoy ---
    add('lockscreen', function () {
      return pinPad('JChatt Locked', 'Enter real PIN or Duress PIN', 'app', '');
    });

    add('vault-lock', function () {
      if (LV.vaultUnlocked) return SCREENS['vault']();
      return pinPad('Hidden Vault', 'Separate PIN protected space', 'vault', 'shield');
    });

    add('vault', function () {
      var lockedChats = JCS.sortedChats(true).filter(function (c) { return !!LV.settings.vaultChatIds[c.id]; });
      return '<div class="scr">'
        + hdr('Hidden Vault', lockedChats.length + ' sealed threads', backBtn('shield'), rb('lock', 'data-act="lockvault"'))
        + '<div class="body nonav">'
        + (lockedChats.length ? lockedChats.map(function (c) {
          return row(av(c.name || c.handle, 44, c.avatar), E(c.name || c.handle), E(c.lastText || 'Vaulted chat'), I('lock', 15), 'data-act="open" data-id="' + E(c.id) + '"');
        }).join('') : emptyP('lock', 'Vault is empty', 'Open any chat\'s Info page and toggle "Move to Hidden Vault".', ''))
        + '</div></div>';
    });

    add('duress-decoy', function () {
      var list = JCS.DURESS_CHATS;
      var activeDecoy = list.find(function (c) { return c.id === LV.activeDecoyId; });
      if (activeDecoy) {
        return '<div class="scr">'
          + hdr(E(activeDecoy.name), E(activeDecoy.handle), '<button class="rb o" data-act="closeDecoy">' + I('back', 20) + '</button>', '')
          + '<div class="msgs">'
          + activeDecoy.msgs.map(function (m) {
            var isMe = m.from === 'me';
            return '<div class="mr ' + (isMe ? 'me' : '') + '"><div class="b ' + (isMe ? 'me ' : '') + 'tail">' + E(m.text) + '<small>' + E(m.time) + '</small></div></div>';
          }).join('')
          + '</div>'
          + '<div class="comp"><div class="inw"><input id="decoy-in" placeholder="Message..."/></div><button class="snd lime" data-act="decoysend">' + I('send', 19) + '</button></div>'
          + '</div>';
      }
      return '<div class="scr">'
        + hdr('<span class="ttl big">Messages</span>', 'Standard mode', '', '<button class="rb o" data-act="exitduress" title="Exit">' + I('lock', 18) + '</button>')
        + '<div class="body nonav">'
        + list.map(function (c) {
          return row(av(c.name, 46), E(c.name), E(c.lastText), E(c.time), 'data-act="opendecoy" data-id="' + c.id + '"');
        }).join('')
        + '</div></div>';
    });

    // --- 2. Masks & Linked Devices ---
    add('masks', function () {
      var me = JFE.me || {};
      var masks = me.masks || [{ id: 'main', name: me.name || 'Primary', handle: me.handle || '@user', bio: me.bio || '', active: true }];
      return '<div class="scr">'
        + hdr('Identity Masks', 'Switch how peers see you', backBtn('shield'), rb('plus', 'data-act="addmask"'))
        + '<div class="body pad nonav">'
        + '<p style="font-size:12px;color:var(--mute);margin-bottom:12px">Tap a mask to update your active display name & bio across JChatt without changing your private cryptographic keys.</p>'
        + '<div class="card" style="margin:0">'
        + masks.map(function (m) {
          return row(ico('mask', m.active ? 'lime' : 'ink'), E(m.name), E(m.bio || m.handle), m.active ? '<span class="badge">Active</span>' : '', 'data-act="usemask" data-id="' + E(m.id) + '"');
        }).join('')
        + '</div></div></div>';
    });

    add('devices', function () {
      var codeInfo = LV.activePairCode;
      return '<div class="scr">'
        + hdr('Linked Devices', 'Sync Laptop or 2nd Phone', backBtn('shield'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + row(ico('phone', 'lime'), 'This browser / device', 'Active Firebase E2EE session', '<span class="badge">Online</span>', '')
        + '</div>'
        + (codeInfo ? '<div class="card" style="margin:0 0 12px;text-align:center">'
          + '<div style="font-size:11px;color:var(--mute)">Enter on your other device:</div>'
          + '<div style="font-size:28px;font-weight:800;letter-spacing:.14em;margin:6px 0">' + E(codeInfo.code) + '</div>'
          + '<p style="font-size:11px;color:var(--mute)">Encrypted client-side with zero plaintext phrase on server. Single use.</p>'
          + '</div>' : '')
        + btn(I('laptop', 17) + ' Generate one-time device link code', '', 'data-act="mkpair"')
        + '</div></div>';
    });

    // --- 3. Disguise & 5 Real Interactive Camouflage Modes ---
    add('disguise', function () {
      var cur = JCA.DIS.find(function (d) { return d.id === LV.settings.disguise; }) || JCA.DIS[0];
      return '<div class="scr">'
        + hdr('App Disguise', 'Stealth mode launcher', backBtn('shield'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + row(ico(cur.ic, 'org'), 'Active disguise: ' + E(cur.name), E(cur.sub), cur.id !== 'default' ? '<button class="pill on" data-go="fake-' + (cur.id === 'fit' ? 'fitness' : cur.id) + '">Test now</button>' : '', '')
        + '</div>'
        + '<div class="sec" style="padding-left:0">Choose launcher camouflage</div>'
        + '<div class="card" style="margin:0">'
        + JCA.DIS.map(function (d) {
          var sel = LV.settings.disguise === d.id;
          return row('<span class="dic" style="width:42px;height:42px;background:' + d.bg + ';color:' + d.fg + '">' + I(d.ic, 20) + '</span>', E(d.name), E(d.sub), sel ? I('check', 18) : '', 'data-act="dsel" data-v="' + d.id + '"');
        }).join('')
        + '</div>'
        + '<div style="margin-top:12px" class="card">'
        + row(ico('bell', 'ink'), 'Disguised notifications', 'Hide sender names on lock screen', I('next', 16), 'data-go="disguise-notify"')
        + row(ico('lock', 'ink'), 'Fake unlock gesture', 'Customize decoy & panic rules', I('next', 16), 'data-go="disguise-more"')
        + '</div></div></div>';
    });

    add('disguise-icons', function () { return SCREENS['disguise'](); });
    add('disguise-notify', function () {
      return '<div class="scr">'
        + hdr('Notification Disguise', '', backBtn('disguise'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + JCA.NOTIF.map(function (n) {
          var on = LV.settings.notifPreset === n.id;
          return row(ico('bell', on ? 'lime' : ''), E(n.name), E(n.body), on ? I('check', 17) : '', 'data-act="nsel" data-v="' + n.id + '"');
        }).join('')
        + '</div></div></div>';
    });
    add('disguise-shot', function () { return SCREENS['privacy-settings'](); });
    add('disguise-more', function () {
      return '<div class="scr">'
        + hdr('Stealth Controls', '', backBtn('disguise'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + row(ico('key', 'ink'), 'Duress PIN setup', LV.settings.duressPin ? 'Configured' : 'Set decoy PIN', I('next', 16), 'data-go="secure-device"')
        + row(ico('alert', 'org'), 'Break-in tamper log', 'Local failed-PIN alerts', I('next', 16), 'data-go="break-in"')
        + row(ico('zap', 'org'), 'Panic wipe gesture', 'Configure emergency clear', I('next', 16), 'data-go="panic-setup"')
        + '</div></div></div>';
    });

    add('fake-calc', function () {
      var btns = [
        ['C', 'fn'], ['+/-', 'fn'], ['%', 'fn'], ['/', 'op'],
        ['7', ''], ['8', ''], ['9', ''], ['*', 'op'],
        ['4', ''], ['5', ''], ['6', ''], ['-', 'op'],
        ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
        ['0', 'z'], ['.', ''], ['=', 'op']
      ];
      return '<div class="scr fk">'
        + '<div class="cd">' + E(LV.calcDisplay || '0') + '</div>'
        + '<div class="cgrid">'
        + btns.map(function (b) {
          return '<button class="' + b[1] + '" data-act="calc" data-v="' + b[0] + '">' + b[0] + '</button>';
        }).join('')
        + '</div></div>';
    });

    add('fake-notes', function () {
      return '<div class="scr paper">'
        + '<div class="top" style="color:var(--text)"><div class="ttl" data-act="unlocktap">QuickNotes</div></div>'
        + '<div class="body pad nonav">'
        + LV.settings.notesList.map(function (n) {
          return '<div class="card" style="margin:0 0 10px"><b>' + E(n.title) + '</b><p style="font-size:12px;color:var(--mute);margin-top:4px">' + E(n.body) + '</p><small style="opacity:.6">' + E(n.time) + '</small></div>';
        }).join('')
        + '<p style="font-size:11px;color:var(--mute);text-align:center">Tip: Double-tap "QuickNotes" header or enter JChatt from Settings to unlock.</p>'
        + '</div></div>';
    });

    add('fake-weather', function () {
      return '<div class="scr" style="background:linear-gradient(175deg,#1668b2,#3898e0);color:#fff;padding:30px 20px">'
        + '<div style="display:flex;justify-content:space-between"><span>SkyCast</span><button data-go="disguise">' + I('sun', 20) + '</button></div>'
        + '<div style="flex:1;display:grid;place-content:center;text-align:center;gap:6px">'
        + '<button style="font-size:68px;font-weight:300;text-align:center" data-act="unlocktap">22&deg;</button>'
        + '<div>Partly Cloudy · UV 4</div><small class="mute">Tap temperature twice to unlock JChatt</small>'
        + '</div></div>';
    });

    add('fake-clock', function () {
      return '<div class="scr fk center">'
        + '<div style="font-size:48px;font-weight:300">' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>'
        + '<p class="mute">WorldClock · Local Time</p>'
        + '<button class="pill" style="margin-top:20px" data-act="unlocktap">Timer</button>'
        + '</div>';
    });

    add('fake-fitness', function () {
      return '<div class="scr" style="background:#134e4a;color:#fff">'
        + hdr('StrideFit', 'Daily Step Tracker', '', rb('activity', 'data-act="unlocktap"'))
        + '<div class="body pad nonav">'
        + '<div class="card" style="text-align:center;margin:0">'
        + '<b style="font-size:36px">6,420</b><div style="color:var(--mute)">steps today · goal 8,000</div>'
        + '<div class="pb"><i style="width:80%"></i></div>'
        + '<div style="margin-top:12px">' + btn('Unlock JChatt', '', 'data-go="chats"') + '</div>'
        + '</div></div></div>';
    });

    // --- 4. Security Systems & Settings Subpages ---
    add('decoy-setup', function () { return SCREENS['secure-device'](); });
    add('break-in', function () {
      return '<div class="scr">'
        + hdr('Tamper Log', 'Local failed unlocks', backBtn('disguise-more'), '')
        + '<div class="body nonav">' + emptyP('shield', 'Zero tamper events', 'No invalid PIN attempts recorded on this device.', '') + '</div></div>';
    });
    add('panic-setup', function () {
      return '<div class="scr">'
        + hdr('Emergency Wipe', 'Zeroize local session', backBtn('disguise-more'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px"><p style="font-size:13px">Immediately clear cached preferences and lock/sign out this device without deleting server account keys.</p></div>'
        + btn(I('zap', 17) + ' Lock & Clear Local Cache', 'red', 'data-act="dologout"')
        + '</div></div>';
    });
    add('network', function () {
      var s = LV.settings;
      return '<div class="scr">'
        + hdr('Network & Relay', 'Connection security', backBtn('shield'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + togRow('shield', 'lime', 'Always relay WebRTC calls', 'Mask IP address during calls', s.relayCalls, 'relayCalls')
        + togRow('globe', 'ink', 'Onion routing preference', 'Route signaling via privacy relay when supported', s.onionRoute, 'onionRoute')
        + row(ico('radio', 'ink'), 'Offline BLE Mesh tester', 'Check nearby mesh diagnostics', I('next', 16), 'data-go="mesh"')
        + '</div></div></div>';
    });
    add('mesh', function () {
      return '<div class="scr">'
        + hdr('Local Mesh Relay', 'Offline proximity info', backBtn('network'), '')
        + '<div class="body nonav">' + emptyP('radio', 'Web Bluetooth idle', 'Local Bluetooth LE discovery runs in native Android when peers are offline nearby.', '') + '</div></div>';
    });

    add('profile-edit', function () {
      var me = JFE.me || {};
      var avatarGrid = JCA.ASSETS.humans.slice(0, 12).map(function (u) {
        var sel = me.avatar === u;
        return '<button style="padding:3px;border-radius:50%;border:3px solid ' + (sel ? 'var(--lime)' : 'transparent') + '" data-act="setav" data-v="' + E(u) + '">'
          + '<img src="' + E(u) + '" width="48" height="48" style="border-radius:50%;display:block;object-fit:cover"/></button>';
      }).join('');
      return '<div class="scr">'
        + hdr('Edit profile', E(me.handle || ''), backBtn('settings'), rb('check', 'data-act="saveprof"'))
        + '<div class="body pad nonav">'
        + '<div style="display:grid;place-items:center;margin-bottom:12px">' + av(me.handle || 'me', 76, me.avatar) + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px">' + avatarGrid + '</div>'
        + '<div class="sec" style="padding-left:0">Display Name</div>'
        + '<div class="inw" style="margin-bottom:10px"><input id="prof-name" type="text" value="' + E(me.name || '') + '"/></div>'
        + '<div class="sec" style="padding-left:0">Bio</div>'
        + '<div class="inw" style="margin-bottom:14px"><input id="prof-bio" type="text" value="' + E(me.bio || '') + '"/></div>'
        + btn('Save profile', '', 'data-act="saveprof"')
        + '</div></div>';
    });

    add('appearance', function () {
      var s = LV.settings;
      var themes = [
        ['default', 'Friendly Hours', '#0a2230', '#82d82f'],
        ['mint', 'Mint Glass', '#14453f', '#3fc26b'],
        ['blue', 'Trivelle', '#0f4fb8', '#ffffff']
      ];
      return '<div class="scr">'
        + hdr('Appearance', 'Palette & accessibility', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + togRow('moon', 'ink', 'Dark Mode', 'Deep slate ink & calm contrast', s.darkMode, 'darkMode')
        + togRow('eye', 'ink', 'Large text mode', 'Boost bubble & label sizes', s.largeText, 'largeText')
        + '</div>'
        + '<div class="sec" style="padding-left:0">Color Theme</div>'
        + '<div class="card" style="margin:0">'
        + themes.map(function (t) {
          var on = s.theme === t[0];
          return row('<span class="dotc" style="background:' + t[2] + ';box-shadow:inset 0 0 0 5px ' + t[3] + '"></span>', E(t[1]), on ? 'Active palette' : 'Tap to apply', on ? I('check', 18) : '', 'data-act="theme3" data-v="' + t[0] + '"');
        }).join('')
        + '</div></div></div>';
    });

    add('privacy-settings', function () {
      var s = LV.settings;
      return '<div class="scr">'
        + hdr('Privacy', 'Message & device hardening', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + togRow('dcheck', 'lime', 'Read receipts', 'Send lime double-checks when reading', s.readReceipts, 'readReceipts')
        + togRow('edit', 'ink', 'Typing indicators', 'Share live typing status', s.typingIndicators, 'typingIndicators')
        + togRow('shield', 'ink', 'Block screenshots', 'Prevent preview capture in recents', s.blockScreenshots, 'blockScreenshots')
        + togRow('eyeOff', 'ink', 'Incognito keyboard', 'Disable keyboard personalization flags', s.incognitoKeyboard, 'incognitoKeyboard')
        + '</div>'
        + '<div class="card" style="margin:0">'
        + row(ico('lock', 'ink'), 'App Lock & Duress PIN', s.appLock ? 'Armed' : 'Off', I('next', 16), 'data-go="secure-device"')
        + row(ico('block', 'org'), 'Blocked contacts', Object.keys(JFE.blocked || {}).length + ' blocked', I('next', 16), 'data-go="blocked"')
        + row(ico('trash', 'org'), 'Burn account permanently', 'Erase @handle & all cloud keys', I('next', 16), 'data-go="burn-account"')
        + '</div></div></div>';
    });

    add('privacy-advanced', function () { return SCREENS['privacy-settings'](); });

    add('notifications', function () {
      var s = LV.settings;
      return '<div class="scr">'
        + hdr('Notifications', 'Disguise & sounds', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + togRow('bell', 'lime', 'In-app chime', 'Gentle pulse on foreground arrival', s.soundEffects, 'soundEffects')
        + togRow('eyeOff', 'ink', 'Hide message previews', 'Mask sender text on alerts', s.notifHidePreview, 'notifHidePreview')
        + row(ico('shield', 'ink'), 'Disguise notification preset', E(s.notifPreset), I('next', 16), 'data-go="disguise-notify"')
        + '</div></div></div>';
    });

    add('blocked', function () {
      var uids = Object.keys(JFE.blocked || {}).filter(function (u) { return JFE.blocked[u]; });
      return '<div class="scr">'
        + hdr('Blocked contacts', uids.length + ' blocked', backBtn('privacy-settings'), '')
        + '<div class="body nonav">'
        + (uids.length ? uids.map(function (u) {
          return row(ico('block', 'org'), 'Blocked user', u, '<button class="pill" data-act="unblock" data-uid="' + E(u) + '">Unblock</button>', '');
        }).join('') : emptyP('check', 'No blocked accounts', 'People you block cannot message or call your @handle.', ''))
        + '</div></div>';
    });

    add('storage', function () {
      var s = LV.settings;
      var msgCount = 0;
      Object.keys(JFE.messagesByChat || {}).forEach(function (cid) { msgCount += Object.keys(JFE.messagesByChat[cid] || {}).length; });
      return '<div class="scr">'
        + hdr('Storage & Backup', 'Zero cloud bloat', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + '<b>Cached messages: ' + msgCount + '</b>'
        + '<p style="font-size:12px;color:var(--mute);margin:4px 0 8px">Active threads load last 80 messages cleanly with canvas image compression.</p>'
        + btn(I('download', 17) + ' Export encrypted JSON backup', '', 'data-act="exportjson"')
        + '</div>'
        + '<div class="card" style="margin:0">'
        + togRow('download', 'lime', 'Auto-download on Wi-Fi', 'Preload compressed photos', s.autoDownloadWifi, 'autoDownloadWifi')
        + togRow('download', 'ink', 'Auto-download on Cellular', 'Save mobile data when off', s.autoDownloadCell, 'autoDownloadCell')
        + '</div></div></div>';
    });

    add('backup', function () { return SCREENS['storage'](); });
    add('data-export', function () { return SCREENS['storage'](); });
    add('app-lock', function () { return SCREENS['secure-device'](); });
    add('2fa-setup', function () { return SCREENS['recovery-phrase'](); });

    add('burn-account', function () {
      return '<div class="scr">'
        + hdr('Burn Account', 'Irreversible erase', backBtn('privacy-settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 14px">'
        + '<b style="color:var(--orange)">Erase identity permanently</b>'
        + '<p style="font-size:13px;color:var(--mute);margin-top:6px">Deletes your @handle from `/v2/handles`, erases `/v2/users`, clears your inbox metadata, and removes your Firebase login credential.</p>'
        + '</div>'
        + btn(I('trash2', 17) + ' Burn my account permanently', 'red', 'data-act="doburn"')
        + '</div></div>';
    });

    // --- 5. Wallet & Mini-Apps / 36+ Domains / Local Real-Chat AI ---
    add('wallet', function () {
      return '<div class="scr">'
        + hdr('Private Ledger', 'Local peer note', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="background:var(--ink);color:#fff;text-align:center;margin:0 0 12px">'
        + '<div style="font-size:11px;opacity:.7">LEDGER BALANCE (DEMO SANDBOX)</div>'
        + '<div style="font-size:36px;font-weight:800;margin:4px 0">' + LV.settings.walletBalance + ' pts</div>'
        + '<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
        + '<button class="pill on" data-go="send-money">Send</button>'
        + '<button class="pill" data-go="request-money">Request</button>'
        + '</div></div>'
        + '<div class="sec" style="padding-left:0">Recent ledger entries</div>'
        + (LV.settings.walletHistory.length
          ? LV.settings.walletHistory.map(function (h) { return row(ico('wallet', 'lime'), E(h.to), E(h.note), (h.dir === 'out' ? '-' : '+') + h.amt + ' pts', ''); }).join('')
          : emptyP('wallet', 'No transactions yet', 'Track shared IOUs or peer splits locally.', ''))
        + '</div></div>';
    });

    add('send-money', function () {
      return '<div class="scr">'
        + hdr('Record Send', '', backBtn('wallet'), '')
        + '<div class="body pad nonav">'
        + '<div class="inw" style="margin-bottom:10px"><input id="wal-to" placeholder="Recipient name or @handle"/></div>'
        + '<div class="inw" style="margin-bottom:14px"><input id="wal-amt" type="number" value="250" placeholder="Amount"/></div>'
        + btn('Record local transfer', '', 'data-act="paynow"')
        + '</div></div>';
    });
    add('request-money', function () {
      return '<div class="scr">'
        + hdr('Request IOU', '', backBtn('wallet'), '')
        + '<div class="body pad nonav">'
        + '<div class="inw" style="margin-bottom:10px"><input id="req-amt" type="number" value="150" placeholder="Amount"/></div>'
        + btn('Record request', '', 'data-act="reqmoney"')
        + '</div></div>';
    });
    add('send-money-done', function () { return SCREENS['wallet'](); });
    add('split-bill', function () { return SCREENS['send-money'](); });
    add('wallet-history', function () { return SCREENS['wallet'](); });
    add('coins-store', function () { return SCREENS['wallet'](); });

    add('ai-assistant', function () { return SCREENS['ai-summary'](); });
    add('ai-summary', function () {
      var msgs = LV.curChatId ? JFE.getChatMessages(LV.curChatId) : [];
      var summaryLines = msgs.slice(-15).filter(function (m) { return m.text && !m.deleted; }).map(function (m) {
        return '• ' + (m.fromName || 'Peer') + ': ' + m.text;
      });
      return '<div class="scr">'
        + hdr('On-Device Thread Digest', '100% local · Zero cloud AI', backBtn(LV.curChatId ? 'chat' : 'explore'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 12px">'
        + '<b>Recent points in active chat (' + summaryLines.length + ' messages)</b>'
        + '<div style="font-size:12px;color:var(--mute);margin-top:8px;display:grid;gap:6px">'
        + (summaryLines.length ? summaryLines.map(function (l) { return '<div>' + E(l) + '</div>'; }).join('') : 'Open a conversation with messages to inspect a fast offline recap.')
        + '</div></div>'
        + btn('Copy recap to clipboard', '', 'data-act="copyrecap"')
        + '</div></div>';
    });
    add('ai-tone', function () { return SCREENS['ai-summary'](); });
    add('ai-translate', function () { return SCREENS['ai-summary'](); });

    add('explore', function () {
      return '<div class="scr">'
        + hdr('Explore JChatt', '39 specialized private spaces', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="gr3" style="padding:0 0 12px">'
        + '<button data-go="ai-summary">' + ico('bot', 'lime') + '<span>On-device Digest</span></button>'
        + '<button data-go="modes">' + ico('sparkles', 'ink') + '<span>Focus Modes</span></button>'
        + '<button data-go="insights">' + ico('activity', 'ink') + '<span>Privacy Health</span></button>'
        + '<button data-go="wallet">' + ico('wallet', 'lime') + '<span>Local Ledger</span></button>'
        + '<button data-go="channels">' + ico('radio', 'ink') + '<span>Broadcasts</span></button>'
        + '<button data-go="explore-all">' + ico('layers', 'org') + '<span>All 39 Spaces</span></button>'
        + '</div>'
        + '<div class="sec" style="padding-left:0">Featured Domain Rooms</div>'
        + '<div class="card" style="margin:0">'
        + JCA.DOMAINS_META.slice(0, 12).map(function (d) {
          return row(ico(d[3], 'lime'), E(d[1]), E(d[2]), I('next', 16), 'data-go="' + d[0] + '"');
        }).join('')
        + '</div></div></div>';
    });

    add('explore-all', function () {
      return '<div class="scr">'
        + hdr('All 39 Mini-Apps', 'Launch into a dedicated workflow', backBtn('explore'), '')
        + '<div class="body nonav">'
        + JCA.DOMAINS_META.map(function (d) {
          return row(ico(d[3], 'ink'), E(d[1]), E(d[2]), I('next', 16), 'data-go="' + d[0] + '"');
        }).join('')
        + '</div></div>';
    });

    // Register all 39 DOMAINS (`d-*`) dynamically with real interactive note + share-to-chat functionality
    JCA.DOMAINS_META.forEach(function (d) {
      add(d[0], function () {
        var noteVal = LV.settings.selectedDomainData[d[0]] || '';
        return '<div class="scr">'
          + hdr(E(d[1]), E(d[2]), backBtn('explore'), '')
          + '<div class="body pad nonav">'
          + '<div class="card" style="margin:0 0 12px;display:flex;gap:12px;align-items:center">'
          + ico(d[3], 'lime', 24)
          + '<div><b>' + E(d[1]) + ' Workspace</b><p style="font-size:12px;color:var(--mute)">' + E(d[2]) + '</p></div>'
          + '</div>'
          + '<div class="sec" style="padding-left:0">Local encrypted scratchpad</div>'
          + '<textarea id="dom-note" data-dom="' + E(d[0]) + '" rows="4" style="width:100%;border-radius:16px;padding:12px;border:1px solid var(--line);font:inherit;background:#fff;color:var(--text)" placeholder="Save private ' + E(d[1].toLowerCase()) + ' notes here...">' + E(noteVal) + '</textarea>'
          + '<div style="margin-top:12px;display:grid;gap:8px">'
          + btn('Save locally', '', 'data-act="savedom" data-v="' + E(d[0]) + '"')
          + (LV.curChatId ? btn('Share to active chat', 'ink', 'data-act="sharedom" data-v="' + E(d[0]) + '"') : '')
          + '</div></div></div>';
      });
    });

    add('modes', function () {
      var list = ['Standard', 'Deep Focus (Mute non-pinned)', 'Travel Stealth (Auto-Calc on lock)', 'Ultra Ephemeral (10s default)'];
      return '<div class="scr">'
        + hdr('Privacy Modes', '', backBtn('explore'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + list.map(function (m) {
          var on = LV.settings.activeMode === m;
          return row(ico('sparkles', on ? 'lime' : ''), E(m), on ? 'Active mode' : 'Tap to activate', on ? I('check', 18) : '', 'data-act="setmode" data-v="' + E(m) + '"');
        }).join('')
        + '</div></div></div>';
    });

    add('insights', function () { return SCREENS['shield'](); });
    add('innovations', function () { return SCREENS['explore'](); });
    add('games', function () { return SCREENS['explore'](); });
    add('communities', function () { return SCREENS['explore'](); });
    add('channels', function () { return SCREENS['updates'](); });
    add('import', function () { return SCREENS['storage'](); });
    add('pro', function () {
      return '<div class="scr">'
        + hdr('JChatt Core', 'Free & open to everyone', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + JCA.mascot('celebrate', 88)
        + '<b>100% Free Worldwide</b>'
        + '<p style="font-size:13px;color:var(--mute);margin-top:6px">Every security tool, calculator disguise, duress PIN, and real Firebase message sync is unlocked for everyone with zero paywalls.</p>'
        + '</div></div></div>';
    });
    add('accessibility', function () { return SCREENS['appearance'](); });
    add('bots', function () { return SCREENS['ai-summary'](); });
    add('tools', function () { return SCREENS['explore'](); });
    add('watch', function () { return SCREENS['devices'](); });

    // --- 6. Help, Legal, About, Feedback & Skeleton/State Fallbacks ---
    add('settings-more', function () {
      return '<div class="scr">'
        + hdr('Help & About', 'JChatt v2.1', backBtn('settings'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0">'
        + row(ico('book', 'lime'), 'Help center', 'How @ID, 12-word restore & pairing work', I('next', 16), 'data-go="help-center"')
        + row(ico('info', 'ink'), 'About JChatt v2', 'Firebase RTDB + WebRTC + Capacitor Android', I('next', 16), 'data-go="about"')
        + row(ico('shield', 'ink'), 'Privacy Policy (GDPR / CCPA)', 'Zero-knowledge data covenants', I('next', 16), 'data-go="privacy-policy"')
        + row(ico('file', 'ink'), 'Terms of Service', 'E2EE Acceptable use & liability terms', I('next', 16), 'data-go="terms-of-service"')
        + row(ico('lock', 'ink'), 'Cryptographic Whitepaper', 'Protocol specification', I('next', 16), 'data-go="security-whitepaper"')
        + row(ico('bell', 'ink'), 'Warrant Canary', 'Transparency declaration', I('next', 16), 'data-go="warrant-canary"')
        + row(ico('globe', 'ink'), 'Landing Page & Web', 'Visit jjcodersjchatt.web.app', I('next', 16), 'data-go="landing"')
        + row(ico('globe', 'ink'), 'Language', E(LV.settings.language), I('next', 16), 'data-go="language-picker"')
        + '</div></div></div>';
    });

    add('help-center', function () {
      return '<div class="scr">'
        + hdr('Help Center', '', backBtn('settings-more'), '')
        + '<div class="body pad nonav">'
        + '<div class="card" style="margin:0 0 10px"><b>How to chat phone-to-phone</b><p style="font-size:12px;color:var(--mute);margin-top:4px">Create your @private-id on Phone A, tap Invite or Search -> Add by @ID, and type Phone B\'s @private-id. Messages sync instantly via Firebase RTDB `/v2/`.</p></div>'
        + '<div class="card" style="margin:0"><b>How Calculator Disguise works</b><p style="font-size:12px;color:var(--mute);margin-top:4px">Enable Calculator+ under Shield -> App Disguise. It behaves like a real calculator; enter 314159 and press = to unlock JChatt.</p></div>'
        + '</div></div>';
    });

    add('about', function () {
      return '<div class="scr">'
        + hdr('About JChatt', 'Build 2.1.0 Production', backBtn('settings-more'), '')
        + '<div class="body pad nonav"><div class="card" style="margin:0;text-align:center">'
        + JCA.mascot('happy', 88)
        + '<h3>JChatt v2</h3>'
        + '<p style="font-size:12px;color:var(--mute);margin-top:6px">Real-time phone-to-phone messenger · Zero dummy contacts · Scannable QR · Stealth calculator & duress PIN.</p>'
        + '</div></div></div>';
    });

    add('transparency', function () { return SCREENS['warrant-canary'] ? SCREENS['warrant-canary']() : SCREENS['about'](); });
    add('contact-support', function () { return SCREENS['help-center'](); });
    add('terms', function () { return SCREENS['terms-of-service'] ? SCREENS['terms-of-service']() : SCREENS['about'](); });
    add('terms-of-service', function () { return SCREENS['terms-of-service'] ? SCREENS['terms-of-service']() : SCREENS['about'](); });
    add('privacy-policy', function () { return SCREENS['privacy-policy'] ? SCREENS['privacy-policy']() : SCREENS['about'](); });
    add('security-whitepaper', function () { return SCREENS['security-whitepaper'] ? SCREENS['security-whitepaper']() : SCREENS['about'](); });
    add('warrant-canary', function () { return SCREENS['warrant-canary'] ? SCREENS['warrant-canary']() : SCREENS['about'](); });
    add('landing', function () { return SCREENS['landing'] ? SCREENS['landing']() : SCREENS['about'](); });
    add('changelog', function () { return SCREENS['about'](); });
    add('feedback', function () { return SCREENS['help-center'](); });
    add('language-picker', function () {
      var langs = ['English (Global)', 'Deutsch', 'Espanol', 'Francais', 'Japanese', 'Hindi'];
      return '<div class="scr">'
        + hdr('Language', '', backBtn('settings-more'), '')
        + '<div class="body pad nonav"><div class="card" style="margin:0">'
        + langs.map(function (l) {
          var on = LV.settings.language === l;
          return row(ico('globe', on ? 'lime' : ''), l, '', on ? I('check', 18) : '', 'data-act="setlang" data-v="' + E(l) + '"');
        }).join('')
        + '</div></div></div>';
    });

    add('skeleton-chats', function () {
      return '<div class="scr">' + hdr('jchatt', 'Connecting...', '', '') + '<div class="body">' + skList(7) + '</div></div>';
    });
    add('skeleton-chat', function () { return SCREENS['skeleton-chats'](); });
    add('connecting', function () {
      return '<div class="scr center" style="background:var(--ink);color:#fff"><div class="spin" style="width:28px;height:28px"></div><p class="mute">Reconnecting to Firebase...</p></div>';
    });
    add('offline', function () {
      return '<div class="scr">' + hdr('Offline', '', backBtn('chats'), '') + '<div class="body">' + emptyP('wifiOff', 'No connection', 'Queued changes sync once back online.', btn('Retry', '', 'data-go="chats"')) + '</div></div>';
    });
    add('user-profile', function () {
      var p = LV.viewingPeerProfile || {};
      return '<div class="scr">'
        + hdr('Profile', E(p.handle || ''), backBtn('chats'), '')
        + '<div class="body pad nonav">'
        + '<div style="display:grid;place-items:center;padding:12px">' + av(p.handle || 'peer', 84, p.avatar) + '<h2 style="margin-top:8px">' + E(p.name || p.handle) + '</h2><p style="color:var(--mute)">' + E(p.bio || '') + '</p></div>'
        + btn('Message ' + E(p.name || p.handle), '', 'data-act="startchat" data-uid="' + E(p.uid || '') + '"')
        + '</div></div>';
    });
    add('doc-viewer', function () {
      var d = LV.viewingDoc || { name: 'Document', size: '—' };
      return '<div class="scr">'
        + hdr(E(d.name), E(d.size), backBtn('chat'), '')
        + '<div class="body">' + emptyP('file', d.name, 'Encrypted document preview verified locally.', '') + '</div></div>';
    });
    add('call-lobby', function () { return SCREENS['calls'](); });
    add('screen-share', function () { return SCREENS['call-video'](); });
    add('scheduled-call', function () { return SCREENS['calls'](); });
    add('call-link-join', function () { return SCREENS['calls'](); });
    add('story-viewers', function () { return SCREENS['status-view'](); });
    add('status-privacy', function () { return SCREENS['privacy-settings'](); });
    add('community-detail', function () { return SCREENS['explore'](); });
    add('channel-view', function () { return SCREENS['updates'](); });
    add('channel-create', function () { return SCREENS['status-compose'](); });
  }

  global.JCS_INIT_EXTRA = initExtraScreens;
})(window);
