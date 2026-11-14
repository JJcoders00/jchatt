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
      if (LN && LN.createChannel) {
        LN.createChannel({
          id: 'jchatt_messages',
          name: 'JChatt Messages',
          description: 'Encrypted message alerts',
          importance: 5,
          visibility: 1,
          vibration: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function startForegroundKeepalive() {
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var FS = Plugins && (Plugins.ForegroundService || (Cap && Cap.Plugins && Cap.Plugins.ForegroundService));
      if (FS && FS.startForegroundService) {
        FS.startForegroundService({
          id: 7771,
          title: 'JChatt Sovereign Sync',
          body: 'Connected for private calls & messages',
          smallIcon: 'ic_launcher',
          silent: true,
          serviceType: 1
        }).catch(function (err) {
          console.log('ForegroundService start err:', err);
        });
      }
    } catch (e) {}
  }

  function sendNotification(title, body, icon) {
    ensureNotificationChannel();
    // 1. Android Capacitor Native Local Notification
    try {
      var Cap = global.Capacitor;
      var Plugins = (Cap && Cap.Plugins) || global.Plugins;
      var LocalNotifs = Plugins && (Plugins.LocalNotifications || (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications));
      if (LocalNotifs && LocalNotifs.schedule) {
        LocalNotifs.schedule({
          notifications: [{
            title: title || 'JChatt',
            body: body || '',
            id: Math.floor(Math.random() * 900000) + 1000,
            channelId: 'jchatt_messages',
            smallIcon: 'ic_launcher',
            schedule: { at: new Date(Date.now() + 50) },
            extra: null
          }]
        }).catch(function () {});
      }
    } catch (err) {}

    // 2. Standard Web & PWA Notification API
    try {
      if (global.Notification) {
        if (Notification.permission === 'granted') {
          var n = new Notification(title, {
            body: body || '',
            icon: icon || './favicon.svg',
            badge: './favicon.svg'
          });
          n.onclick = function () {
            global.focus();
            n.close();
          };
        } else if (Notification.permission === 'default' && Notification.requestPermission) {
          Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
              new Notification(title, {
                body: body || '',
                icon: icon || './favicon.svg'
              });
            }
          }).catch(function () {});
        }
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
