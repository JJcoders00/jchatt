(function (global) {
  'use strict';

  var ctx = null;
  function getCtx() {
    if (!ctx) {
      var AudioContext = global.AudioContext || global.webkitAudioContext;
      if (AudioContext) ctx = new AudioContext();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  var activeLoops = [];

  function stopAll() {
    activeLoops.forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
    activeLoops = [];
  }

  // Incoming Call Ringtone: Modern, harmonic, pleasant dual-tone chime loop
  function playIncomingCall() {
    stopAll();
    var stopped = false;
    function ringPattern() {
      if (stopped) return;
      var c = getCtx();
      if (!c) return;
      var now = c.currentTime;

      // Note sequence: E5 (659Hz), G#5 (830Hz), B5 (987Hz), pause, E6 (1318Hz)
      var notes = [
        { f: 659.25, t: 0.0, d: 0.16 },
        { f: 830.61, t: 0.16, d: 0.16 },
        { f: 987.77, t: 0.32, d: 0.26 },
        { f: 659.25, t: 0.72, d: 0.16 },
        { f: 830.61, t: 0.88, d: 0.16 },
        { f: 1318.51, t: 1.04, d: 0.42 }
      ];

      notes.forEach(function (n) {
        try {
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.f, now + n.t);

          gain.gain.setValueAtTime(0, now + n.t);
          gain.gain.linearRampToValueAtTime(0.24, now + n.t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

          osc.connect(gain);
          gain.connect(c.destination);

          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.05);
        } catch (e) {}
      });
    }

    ringPattern();
    var interval = setInterval(ringPattern, 2400);
    activeLoops.push(function () {
      stopped = true;
      clearInterval(interval);
    });
  }

  // Outgoing Ringback: Soft dual harmonic pulse (440Hz + 480Hz) every 3.2s
  function playRingback() {
    stopAll();
    var stopped = false;
    function pulse() {
      if (stopped) return;
      var c = getCtx();
      if (!c) return;
      var now = c.currentTime;
      [440, 480].forEach(function (f) {
        try {
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.setValueAtTime(0.08, now + 1.15);
          gain.gain.linearRampToValueAtTime(0.0001, now + 1.22);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 1.25);
        } catch (e) {}
      });
    }
    pulse();
    var interval = setInterval(pulse, 3200);
    activeLoops.push(function () {
      stopped = true;
      clearInterval(interval);
    });
  }

  // Call Connected: Upbeat two-tone chime (C5 -> G5)
  function playCallConnected() {
    stopAll();
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    [{ f: 523.25, t: 0, d: 0.15 }, { f: 783.99, t: 0.15, d: 0.35 }].forEach(function (n) {
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0, now + n.t);
        gain.gain.linearRampToValueAtTime(0.2, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.05);
      } catch (e) {}
    });
  }

  // Call Ended: Soft descending chime (G4 -> C4)
  function playCallEnded() {
    stopAll();
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    [{ f: 392.00, t: 0, d: 0.14 }, { f: 261.63, t: 0.14, d: 0.32 }].forEach(function (n) {
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0, now + n.t);
        gain.gain.linearRampToValueAtTime(0.18, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.05);
      } catch (e) {}
    });
  }

  // Message Sent: Crisp light bubble pop
  function playMsgSent() {
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.07);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Message Received: Gentle notification chime
  function playMsgReceived() {
    var c = getCtx();
    if (!c) return;
    var now = c.currentTime;
    [{ f: 783.99, t: 0, d: 0.08 }, { f: 1046.50, t: 0.08, d: 0.18 }].forEach(function (n) {
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0, now + n.t);
        gain.gain.linearRampToValueAtTime(0.2, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.05);
      } catch (e) {}
    });
  }

  function ensureNotificationChannel() {
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var LN = Plugins && (Plugins.LocalNotifications || (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications));
      if (LN) {
        if (LN.requestPermissions) {
          LN.requestPermissions().catch(function () {});
        }
        if (LN.createChannel) {
          LN.createChannel({
            id: 'jchatt_messages',
            name: 'JChatt Messages',
            description: 'Encrypted message alerts',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#00a884'
          }).catch(function () {});
        }
      }
    } catch (e) {}
  }

  function startForegroundKeepalive() {
    // Native JChattSyncService handles silent 24/7 background sync via native Java thread without spamming notification drawer
  }

  function sendNotification(title, body, icon) {
    ensureNotificationChannel();
    var s = (global.LV && global.LV.settings) || {};
    var notifTitle = title || 'JChatt';
    var notifBody = body || 'New encrypted message';
    var notifIcon = icon || './favicon.svg';

    // Apply Killer Notification Morphing / Disguise Presets
    if (s.notifPreset && s.notifPreset !== 'off' && s.notifPreset !== 'neutral') {
      var nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (s.notifPreset === 'clock') {
        notifTitle = 'World Clock · Alarm Sync';
        notifBody = 'Current system time is ' + nowTime;
      } else if (s.notifPreset === 'fit') {
        notifTitle = 'StrideFit Activity';
        notifBody = 'Goal reached: 7,420 steps at ' + nowTime;
      } else if (s.notifPreset === 'calc') {
        notifTitle = 'Scientific Calculator';
        notifBody = 'Memory registers updated at ' + nowTime;
      } else if (s.notifPreset === 'ai') {
        notifTitle = 'AI Assistant';
        notifBody = 'Inference response ready (' + nowTime + ')';
      } else if (s.notifPreset === 'work') {
        notifTitle = 'Calendar Sync';
        notifBody = 'Weekly standup notes synchronized at ' + nowTime;
      } else if (s.notifPreset === 'sys') {
        notifTitle = 'System Service';
        notifBody = 'Background configuration refreshed at ' + nowTime;
      }
    } else if (s.notifHidePreview) {
      notifTitle = 'JChatt';
      notifBody = 'New encrypted message received';
    }

    if (s.notifPreset === 'off') {
      return; // Disguise: Completely suppressed
    }

    // 1. Android Capacitor Native Local Notification
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var LocalNotifs = Plugins && (Plugins.LocalNotifications || (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications));
      if (LocalNotifs && LocalNotifs.schedule) {
        LocalNotifs.schedule({
          notifications: [{
            title: notifTitle,
            body: notifBody,
            id: Math.floor(Math.random() * 900000) + 1000,
            channelId: 'jchatt_messages',
            smallIcon: 'ic_launcher',
            schedule: { at: new Date(Date.now() + 50) },
            extra: null
          }]
        }).catch(function () {});
      }
    } catch (err) {}

    // 2. Direct Web Notification (Desktop Chrome, Firefox, Safari, Edge)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        var n = new Notification(notifTitle, {
          body: notifBody,
          icon: notifIcon,
          badge: notifIcon,
          tag: 'jchatt_' + Date.now()
        });
        n.onclick = function () {
          try { global.focus(); } catch (e) {}
          n.close();
        };
        return;
      }
    } catch (err) {
      // Mobile Chrome may throw TypeError: Illegal Constructor, fall through to ServiceWorker
    }

    // 3. Fallback ServiceWorker Notification (Android Chrome / PWA)
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.showNotification) {
            reg.showNotification(notifTitle, {
              body: notifBody,
              icon: notifIcon,
              badge: notifIcon,
              vibrate: [200, 100, 200]
            }).catch(function () {});
          }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  global.JCSOUND = {
    playIncomingCall: playIncomingCall,
    playRingback: playRingback,
    playCallConnected: playCallConnected,
    playCallEnded: playCallEnded,
    playMsgSent: playMsgSent,
    playMsgReceived: playMsgReceived,
    sendNotification: sendNotification,
    ensureNotificationChannel: ensureNotificationChannel,
    startForegroundKeepalive: startForegroundKeepalive,
    stopAll: stopAll
  };
})(window);
