(function (global) {
  'use strict';

  var LEGAL_DOCS = {
    privacy: {
      title: 'Zero-Knowledge Privacy Policy',
      updated: 'November 2026',
      content: [
        {
          heading: '1. Core Philosophy: Zero Telemetry & Cryptographic Isolation',
          body: 'JChatt is engineered from first principles on a zero-knowledge architecture. Unlike traditional messengers (e.g. WhatsApp, Telegram, or Signal) that require a cellular phone number and upload your personal address book to cloud servers, JChatt requires NO phone number, NO email address, and NO personal identity documents. All identities are derived client-side via cryptographically secure SHA-256 hashes.'
        },
        {
          heading: '2. Data Collection Disclosure: What We Do NOT Collect',
          body: '• No Phone Numbers: We never request or store phone numbers.<br>'
            + '• No Contact Book Scraping: We never access, copy, or sync your phone address book.<br>'
            + '• No Location Telemetry: We do not log GPS, IP geolocation, or physical location history.<br>'
            + '• No Advertising Identifiers: We contain zero advertising SDKs, tracking pixels, or third-party analytics trackers.<br>'
            + '• No Plaintext Keys: Your 12-word recovery seed and encryption keys are created solely in client memory and are NEVER transmitted to or stored on our servers.'
        },
        {
          heading: '3. End-to-End Cryptography & Data in Transit',
          body: 'All direct messages, group payloads, photo attachments, voice notes, and polls are sealed on the sender device before transit. Real-time signaling is routed via Firebase Realtime Database with strict authorization rules, and peer-to-peer audio/video calling uses WebRTC with DTLS-SRTP media encryption. Plaintext is only decipherable by the intended recipient holding the verified cryptographic keys.'
        },
        {
          heading: '4. Ephemeral Retention & Disappearing Timers',
          body: 'Users maintain sovereign control over message lifespans. Configurable timers (10 seconds, 1 hour, 24 hours, 7 days, or burn-after-reading) purge expired messages automatically from client storage and server nodes. 24-hour status stories self-destruct exactly 24 hours after publication.'
        },
        {
          heading: '5. GDPR & International Compliance (Regulation EU 2016/679)',
          body: '• Article 5(1)(c) (Data Minimisation): JChatt collects only the cryptographic tokens necessary to route encrypted packets.<br>'
            + '• Article 17 (Right to Erasure / Right to be Forgotten): Users can execute an instant "Burn Account" action in settings. This wipes all user profile records, handles, and conversation pointers from the database permanently.<br>'
            + '• Article 20 (Right to Data Portability): Users can export their local conversation history as encrypted or decrypted JSON at any time.<br>'
            + '• Article 32 (Security of Processing): Cryptographic state separation ensures no unauthorized third party or server administrator can access message content.'
        },
        {
          heading: '6. California Consumer Privacy Act (CCPA / CPRA)',
          body: 'We do not sell, rent, or share personal information with third parties for monetary or other valuable consideration. Because we store zero personal identifiers, there is no cross-context behavioral tracking.'
        },
        {
          heading: '7. Children\'s Online Privacy Protection Act (COPPA)',
          body: 'JChatt is not directed to children under 13 years of age. Because the service does not collect names, emails, phone numbers, or demographic data, no personal data from minors is harvested or retained.'
        },
        {
          heading: '8. Cryptographic Self-Custody & User Responsibility',
          body: 'You are the sole custodian of your 12-word recovery phrase. If you lose your recovery phrase and sign out or clear your browser data, your account and encrypted history CANNOT be recovered by JChatt, Google, or any third party.'
        }
      ]
    },

    terms: {
      title: 'Terms of Service',
      updated: 'November 2026',
      content: [
        {
          heading: '1. Agreement to Terms',
          body: 'By accessing or using JChatt (web client at jjcodersjchatt.web.app or native Android application), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the application.'
        },
        {
          heading: '2. Acceptable Use Policy',
          body: 'You agree to use JChatt solely for lawful personal and professional communications. You explicitly agree NOT to:<br>'
            + '• Distribute, transmit, or store child sexual abuse material (CSAM). CSAM is strictly prohibited and subject to immediate account termination and law enforcement reporting.<br>'
            + '• Transmit viruses, worms, malware, or destructive code.<br>'
            + '• Engage in unlawful harassment, extortion, death threats, or incitement of imminent violence.<br>'
            + '• Probe, scan, or exploit vulnerabilities in the service infrastructure without written authorization.'
        },
        {
          heading: '3. Zero-Knowledge Cryptographic Architecture',
          body: 'You acknowledge and understand that JChatt provides end-to-end cryptographic encryption. Communications are sealed on client devices. You retain full and exclusive responsibility for your 12-word recovery phrase, private keys, and local device security.'
        },
        {
          heading: '4. Disclaimer of Warranties',
          body: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, UPTIME GUARANTEES, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE AT ALL TIMES.'
        },
        {
          heading: '5. Limitation of Liability',
          body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL JCHATT, ITS AUTHORS, DEVELOPERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR DEVICE DAMAGE ARISING OUT OF YOUR USE OF THE SERVICE. TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED $0 OR THE AMOUNT PAID BY YOU TO USE THE SERVICE.'
        },
        {
          heading: '6. Governing Law & Dispute Resolution',
          body: 'These Terms shall be governed by and construed in accordance with the laws of applicable commercial jurisdiction, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms will be brought exclusively in competent arbitration courts.'
        }
      ]
    },

    security: {
      title: 'Cryptographic Security Whitepaper',
      updated: 'November 2026',
      content: [
        {
          heading: '1. Handle & Password Derivation',
          body: 'When a user registers an ID (e.g. <code>@alex.r</code>), the handle is normalized and hashed client-side using pure JavaScript SHA-256 (FIPS PUB 180-4 compliant). The resulting 64-character hex digest forms a deterministic synthetic identifier, ensuring the server database never contains plain handles or email addresses.'
        },
        {
          heading: '2. Recovery Seed & Key Agreement',
          body: 'Accounts are secured by a 12-word BIP-39 compatible mnemonic phrase generated with <code>crypto.getRandomValues()</code>. The phrase combined with the handle derives the private key via PBKDF2-HMAC-SHA256 with high iteration counts, guaranteeing zero plaintext passwords in memory or transit.'
        },
        {
          heading: '3. Peer-to-Peer Calling Media Encryption',
          body: 'Voice and video calls connect directly between devices using WebRTC DTLS-SRTP (Datagram Transport Layer Security - Secure Real-time Transport Protocol). Media packets do not pass through application proxy servers, ensuring uncompromised audio confidentiality.'
        },
        {
          heading: '4. Disguise Architecture & Camouflage Isolation',
          body: 'JChatt includes a stealth engine allowing the interface to impersonate a fully functional calculator (unlocked by typing <code>314159 =</code>), notes app, or weather widget. A separate 4-digit Duress PIN loads a decoupled decoy database with zero references to real private threads.'
        }
      ]
    },

    canary: {
      title: 'Warrant Canary & Transparency',
      updated: 'November 2026',
      content: [
        {
          heading: '1. Zero-Retention Warrant Canary',
          body: 'As of November 2026, JChatt confirms:<br>'
            + '• We have received ZERO national security letters (NSLs).<br>'
            + '• We have received ZERO FISA court orders or gag orders.<br>'
            + '• We have installed ZERO backdoors or law enforcement monitoring taps.<br>'
            + '• We have modified ZERO software routines to weaken encryption or leak user keys.'
        },
        {
          heading: '2. Technical Incapability to Decrypt',
          body: 'Because JChatt operates on client-side zero-knowledge cryptography, even if served with a court order or subpoena, JChatt cannot produce unencrypted messages, call audio, or private encryption keys. We literally do not possess them.'
        }
      ]
    }
  };

  function renderLegalDoc(docKey) {
    var doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;
    var sections = doc.content.map(function (sec) {
      return '<div style="margin-bottom:20px">'
        + '<h3 style="font-size:16px;font-weight:700;color:var(--ink);margin:0 0 6px">' + sec.heading + '</h3>'
        + '<div style="font-size:13.5px;line-height:1.65;color:#334d5c">' + sec.body + '</div>'
        + '</div>';
    }).join('');

    return '<div class="legal-doc" style="max-width:820px;margin:0 auto;padding:24px 20px 48px;color:var(--ink);font-family:Sora,sans-serif">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d8e2e6;padding-bottom:14px;margin-bottom:20px">'
      + '<div><h1 style="font-size:24px;font-weight:800;letter-spacing:-.03em;margin:0">' + doc.title + '</h1>'
      + '<span style="font-size:12px;color:#6b828f">Effective: ' + doc.updated + ' · JChatt Sovereign Systems</span></div>'
      + '<button class="pill" data-act="closelegal" style="background:var(--in);color:var(--ink)">Close</button>'
      + '</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px">'
      + '<button class="pill ' + (docKey === 'privacy' ? 'on' : '') + '" data-act="openlegal" data-v="privacy">Privacy Policy</button>'
      + '<button class="pill ' + (docKey === 'terms' ? 'on' : '') + '" data-act="openlegal" data-v="terms">Terms of Service</button>'
      + '<button class="pill ' + (docKey === 'security' ? 'on' : '') + '" data-act="openlegal" data-v="security">Security Whitepaper</button>'
      + '<button class="pill ' + (docKey === 'canary' ? 'on' : '') + '" data-act="openlegal" data-v="canary">Warrant Canary</button>'
      + '</div>'
      + sections
      + '<div style="margin-top:30px;padding:16px;background:#eef4f5;border-radius:14px;font-size:12px;color:#546e7a">'
      + 'JChatt is open-source, non-commercial software developed for sovereign, peer-to-peer privacy. For security inquiries or audit reports, review the official repository at <a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener" style="color:#0a2230;font-weight:700">github.com/JJcoders00/jchatt</a>.'
      + '</div>'
      + '</div>';
  }

  function renderLandingPage(activeLegalModal) {
    var I = function (name, size) { return (global.JCA && global.JCA.ic) ? global.JCA.ic(name, size) : ''; };
    var heroImg = (global.JCA && global.JCA.ASSETS && global.JCA.ASSETS.mascotHero) || './images/mascot/mascot_hero.png';

    var legalModalHtml = '';
    if (activeLegalModal) {
      legalModalHtml = '<div class="wscrim" data-act="closelegal" style="z-index:999"></div>'
        + '<div class="wmod" style="z-index:1000;width:min(900px,94vw);max-height:88vh;overflow-y:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 64px rgba(10,34,48,.35)">'
        + renderLegalDoc(activeLegalModal)
        + '</div>';
    }

    return '<div class="landing-page" style="min-height:100vh;background:var(--paper);color:var(--ink);font-family:Sora,sans-serif;display:flex;flex-direction:column">'
      + legalModalHtml
      // 1. Sticky Navigation Bar
      + '<header style="position:sticky;top:0;z-index:100;background:rgba(243,245,245,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(10,34,48,.08);padding:12px 24px">'
      + '<div style="max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px">'
      + '<div style="display:flex;align-items:center;gap:10px;cursor:pointer" data-act="gohome">'
      + '<img src="./favicon.svg" width="34" height="34" style="border-radius:10px" alt="JChatt Icon"/>'
      + '<span style="font-size:22px;font-weight:800;letter-spacing:-.04em;color:#0a2230">jchatt</span>'
      + '<span class="pill" style="font-size:10px;padding:2px 8px;background:#0a2230;color:#82d82f;font-weight:700">v2.0 E2EE</span>'
      + '</div>'
      + '<nav style="display:flex;align-items:center;gap:20px" class="hide-mobile">'
      + '<a href="#features" style="text-decoration:none;color:#334d5c;font-size:14px;font-weight:600">Features</a>'
      + '<a href="#security" style="text-decoration:none;color:#334d5c;font-size:14px;font-weight:600">Security</a>'
      + '<a href="#download" style="text-decoration:none;color:#334d5c;font-size:14px;font-weight:600">Download APK</a>'
      + '<button data-act="openlegal" data-v="privacy" style="background:none;border:none;color:#334d5c;font-size:14px;font-weight:600;cursor:pointer;padding:0">Privacy Policy</button>'
      + '<button data-act="openlegal" data-v="terms" style="background:none;border:none;color:#334d5c;font-size:14px;font-weight:600;cursor:pointer;padding:0">Terms</button>'
      + '</nav>'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<button class="pill on" data-act="openweb" style="background:#82d82f;color:#0a2230;font-weight:700;font-size:13.5px;padding:9px 18px;border:none;border-radius:24px;cursor:pointer;box-shadow:0 4px 12px rgba(130,216,47,.35)">'
      + I('chats', 16) + ' Open JChatt Web'
      + '</button>'
      + '</div>'
      + '</div>'
      + '</header>'

      // 2. Hero Section
      + '<section style="padding:60px 24px 80px;text-align:center;position:relative;overflow:hidden">'
      + '<div style="max-width:980px;margin:0 auto;position:relative;z-index:2">'
      + '<div style="display:inline-flex;align-items:center;gap:8px;background:#e2ece9;color:#175343;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;margin-bottom:20px">'
      + '<span style="width:8px;height:8px;border-radius:50%;background:#82d82f"></span>'
      + 'Sovereign Phone-to-Phone Messenger · Zero Telemetry · No Phone Number'
      + '</div>'
      + '<h1 class="lp-hero-title" style="font-size:clamp(34px,6vw,56px);font-weight:800;letter-spacing:-.04em;line-height:1.1;margin:0 0 20px;color:#0a2230">'
      + 'Simple. Private. Real-Time.<br><span style="color:#2d9d86">True Sovereign Messaging.</span>'
      + '</h1>'
      + '<p style="font-size:clamp(16px,2.2vw,19px);line-height:1.6;color:#476270;max-width:720px;margin:0 auto 34px">'
      + 'Phone-to-phone encrypted messaging, WebRTC crystal-clear voice & video calls, 10-second vanishing timers, and stealth calculator camouflage. Zero ads. Zero tracking. Zero seeds.'
      + '</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:48px">'
      + '<button class="pill on" data-act="openweb" style="font-size:15px;padding:14px 28px;background:#82d82f;color:#0a2230;font-weight:800;border:none;border-radius:30px;cursor:pointer;box-shadow:0 8px 24px rgba(130,216,47,.45)">'
      + I('chats', 18) + ' Launch JChatt Web (/web)'
      + '</button>'
      + '<a href="#download" class="pill" style="text-decoration:none;font-size:15px;padding:14px 28px;background:#0a2230;color:#fff;font-weight:700;border-radius:30px;box-shadow:0 8px 20px rgba(10,34,48,.25);display:inline-flex;align-items:center;gap:8px">'
      + I('phone', 18) + ' Download Android APK'
      + '</a>'
      + '</div>'

      // Hero Interactive Device Mockup with Mascot & Floating Bubbles
      + '<div style="position:relative;max-width:540px;margin:0 auto;background:#fff;border-radius:32px;box-shadow:0 30px 80px rgba(10,34,48,.18);border:8px solid #0a2230;padding:24px;overflow:hidden">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eef2f2;padding-bottom:10px">'
      + '<div style="display:flex;align-items:center;gap:8px"><img src="' + heroImg + '" width="36" height="36" style="border-radius:50%"/><b>JChatt Live</b></div>'
      + '<span class="badge" style="background:#82d82f;color:#0a2230;font-weight:700">Encrypted</span>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px;text-align:left">'
      + '<div style="align-self:flex-start;background:#eef2f2;padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:13px;max-width:80%">'
      + 'Hey! Just verified my 12-word seed. Zero phone number required.'
      + '<div style="font-size:10px;color:#8fa2ad;margin-top:4px">11:42 AM</div>'
      + '</div>'
      + '<div style="align-self:flex-end;background:#82d82f;color:#0a2230;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;font-weight:600;max-width:80%">'
      + 'Awesome! Armed 10s vanishing timer. Call audio is DTLS-SRTP peer-to-peer! ⏱️'
      + '<div style="font-size:10px;color:#1f4d0d;margin-top:4px;display:flex;justify-content:flex-end;gap:4px">11:43 AM <span style="font-weight:900">✓✓</span></div>'
      + '</div>'
      + '<div style="align-self:flex-start;background:#eef2f2;padding:8px 14px;border-radius:18px;font-size:12px;color:#2d9d86;display:flex;align-items:center;gap:6px">'
      + I('lock', 14) + ' Duress Decoy PIN armed (9999) · Zero plaintext on server'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</section>'

      // 3. Why JChatt / Philosophy Comparison Section
      + '<section id="security" style="padding:70px 24px;background:#0a2230;color:#fff">'
      + '<div style="max-width:1080px;margin:0 auto">'
      + '<div style="text-align:center;max-width:700px;margin:0 auto 50px">'
      + '<span class="pill" style="background:#1b394a;color:#82d82f;font-weight:700;font-size:11px;margin-bottom:12px">PRIVACY PARADIGM SHIFT</span>'
      + '<h2 style="font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-.03em;margin:0 0 14px">Why JChatt Leaves Traditional Apps Behind</h2>'
      + '<p style="color:#94aebc;font-size:16px;line-height:1.6">Corporate messengers harvest your contact graph, log metadata, and mandate SIM card identity. JChatt restores complete sovereign privacy.</p>'
      + '</div>'

      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px">'
      // Card 1
      + '<div style="background:#122836;border:1px solid #1e3d52;border-radius:20px;padding:26px">'
      + '<div style="width:44px;height:44px;border-radius:12px;background:#ff6a2b;color:#fff;display:grid;place-items:center;margin-bottom:16px">' + I('user', 22) + '</div>'
      + '<h3 style="font-size:19px;font-weight:700;margin:0 0 8px;color:#fff">Zero Phone Numbers</h3>'
      + '<p style="font-size:13.5px;line-height:1.6;color:#94aebc">No SIM swap attacks, no SMS intercept vulnerabilities, and no government telecom registration. Derive your identity from a 12-word cryptographic seed.</p>'
      + '</div>'
      // Card 2
      + '<div style="background:#122836;border:1px solid #1e3d52;border-radius:20px;padding:26px">'
      + '<div style="width:44px;height:44px;border-radius:12px;background:#82d82f;color:#0a2230;display:grid;place-items:center;margin-bottom:16px">' + I('calls', 22) + '</div>'
      + '<h3 style="font-size:19px;font-weight:700;margin:0 0 8px;color:#fff">Phone-to-Phone WebRTC Calling</h3>'
      + '<p style="font-size:13.5px;line-height:1.6;color:#94aebc">Voice and video calls use peer-to-peer DTLS-SRTP media encryption with acoustic echo suppression and pure Web Audio API synthesizer ringtones.</p>'
      + '</div>'
      // Card 3
      + '<div style="background:#122836;border:1px solid #1e3d52;border-radius:20px;padding:26px">'
      + '<div style="width:44px;height:44px;border-radius:12px;background:#2d9d86;color:#fff;display:grid;place-items:center;margin-bottom:16px">' + I('shield', 22) + '</div>'
      + '<h3 style="font-size:19px;font-weight:700;margin:0 0 8px;color:#fff">Duress PIN & Disguise Vault</h3>'
      + '<p style="font-size:13.5px;line-height:1.6;color:#94aebc">Under coercion, enter your 4-digit Duress PIN (9999) to open a realistic decoy inbox. Or disguise the entire app as a fully working calculator (314159 =).</p>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</section>'

      // 4. Feature Capabilities Section
      + '<section id="features" style="padding:80px 24px;background:#f8fafb">'
      + '<div style="max-width:1080px;margin:0 auto">'
      + '<div style="text-align:center;max-width:680px;margin:0 auto 50px">'
      + '<span class="pill" style="background:#d8ece8;color:#1e6a57;font-weight:700;font-size:11px;margin-bottom:12px">FEATURE ATLAS</span>'
      + '<h2 style="font-size:clamp(28px,4vw,38px);font-weight:800;letter-spacing:-.03em;margin:0 0 12px;color:#0a2230">Engineered for Everyday Life</h2>'
      + '<p style="color:#577280;font-size:15px;line-height:1.6">Everything you love about modern messaging without the corporate surveillance.</p>'
      + '</div>'

      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">'
      // Feature 1
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#ff6a2b;margin-bottom:10px">' + I('timer', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">10s Vanishing Messages</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">Messages self-destruct exactly 10s, 1h, 24h, or 7d after receipt. Vanishes from chat lists and database simultaneously.</p>'
      + '</div>'
      // Feature 2
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#82d82f;margin-bottom:10px">' + I('sparkles', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">Mascot Stickers & Polls</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">Expressive mascot sticker drawer and real-time interactive cross-device polls with instant cryptographic vote counting.</p>'
      + '</div>'
      // Feature 3
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#2d9d86;margin-bottom:10px">' + I('laptop', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">Encrypted Device Linking</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">Link your laptop and phone in seconds using single-use 8-character pairing codes (XXXX-XXXX) or byte-mode QR codes.</p>'
      + '</div>'
      // Feature 4
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#0a2230;margin-bottom:10px">' + I('bell', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">Disguised Notifications</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">Customizable lock-screen notification presets mask sender handles and message previews behind ordinary system alerts.</p>'
      + '</div>'
      // Feature 5
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#ff6a2b;margin-bottom:10px">' + I('flame', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">Permanent Account Burn</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">One-tap cryptographic wipe. Deletes all user handles, profile pointers, and message roots with zero residual recovery.</p>'
      + '</div>'
      // Feature 6
      + '<div style="background:#fff;border-radius:20px;padding:22px;border:1px solid #e1e9ec;box-shadow:0 6px 16px rgba(10,34,48,.04)">'
      + '<div style="color:#2d9d86;margin-bottom:10px">' + I('palette', 26) + '</div>'
      + '<h4 style="font-size:17px;font-weight:700;margin:0 0 6px">Themes & Dark Mode</h4>'
      + '<p style="font-size:13px;line-height:1.55;color:#617c8a;margin:0">Deep slate ink dark mode plus Friendly Hours, Mint Glass, and Trivelle color palettes with crisp stroke-SVG iconography.</p>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</section>'

      // 5. Download Center Section
      + '<section id="download" style="padding:80px 24px;background:#fff;border-top:1px solid #e6edf0">'
      + '<div style="max-width:960px;margin:0 auto;text-align:center">'
      + '<span class="pill" style="background:#0a2230;color:#82d82f;font-weight:700;font-size:11px;margin-bottom:12px">GET JCHATT TODAY</span>'
      + '<h2 style="font-size:clamp(28px,4vw,38px);font-weight:800;letter-spacing:-.03em;margin:0 0 14px;color:#0a2230">Connect Across Phone & Web</h2>'
      + '<p style="color:#577280;font-size:15px;line-height:1.6;max-width:620px;margin:0 auto 40px">Install on Android or run directly in your favorite desktop browser.</p>'

      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;text-align:left">'
      // Android Card
      + '<div style="background:#f8fafb;border-radius:24px;padding:30px;border:2px solid #82d82f;box-shadow:0 12px 30px rgba(130,216,47,.12);position:relative">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      + '<h3 style="font-size:22px;font-weight:800;margin:0;color:#0a2230">Android APK</h3>'
      + '<span class="pill" style="background:#82d82f;color:#0a2230;font-weight:700;font-size:11px">v2.0 Production</span>'
      + '</div>'
      + '<p style="font-size:13.5px;color:#546e7a;line-height:1.6;margin-bottom:20px">Direct native installation package for Android 8.0+. Zero Google Play account required.</p>'
      + '<ul style="font-size:12px;color:#617c8a;padding-left:18px;margin-bottom:24px;line-height:1.8">'
      + '<li>File size: ~22.8 MB (Native Android ARM64/x86_64)</li>'
      + '<li>Permissions: Mic & Camera (calls only), zero contacts</li>'
      + '<li>Background WebRTC & push notification ready</li>'
      + '</ul>'
      + '<a href="https://jjcoders00.github.io/jchatt/app-debug.apk" download="app-debug.apk" data-act="dlapk" style="display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;background:#0a2230;color:#fff;font-weight:800;font-size:14.5px;padding:14px;border-radius:18px">'
      + I('phone', 18) + ' Download JChatt Android APK'
      + '</a>'
      + '<div style="text-align:center;margin-top:10px"><a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener" style="font-size:12px;color:#617c8a;text-decoration:underline">Mirror on GitHub Releases</a></div>'
      + '</div>'

      // Web Client Card
      + '<div style="background:#f8fafb;border-radius:24px;padding:30px;border:1px solid #dbe5e8">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      + '<h3 style="font-size:22px;font-weight:800;margin:0;color:#0a2230">JChatt Web</h3>'
      + '<span class="pill" style="background:#eef2f2;color:#0a2230;font-weight:700;font-size:11px">Any Browser</span>'
      + '</div>'
      + '<p style="font-size:13.5px;color:#546e7a;line-height:1.6;margin-bottom:20px">Full desktop multi-column workspace or adaptive mobile phone interface in Chrome, Safari, Firefox, or Edge.</p>'
      + '<ul style="font-size:12px;color:#617c8a;padding-left:18px;margin-bottom:24px;line-height:1.8">'
      + '<li>Instant load with zero download or installation</li>'
      + '<li>Desktop keyboard shortcuts (Ctrl+K search, Enter to send)</li>'
      + '<li>PWA installable directly to desktop or home screen</li>'
      + '</ul>'
      + '<button class="pill on" data-act="openweb" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#82d82f;color:#0a2230;font-weight:800;font-size:14.5px;padding:14px;border:none;border-radius:18px;cursor:pointer">'
      + I('chats', 18) + ' Launch Web Client (/web)'
      + '</button>'
      + '<div style="text-align:center;margin-top:10px;font-size:12px;color:#617c8a">URL: jjcodersjchatt.web.app/web</div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</section>'

      // 6. Legal & Compliance Section
      + '<section style="padding:60px 24px;background:#eef4f5;border-top:1px solid #dce6e9">'
      + '<div style="max-width:960px;margin:0 auto;text-align:center">'
      + '<h3 style="font-size:22px;font-weight:800;margin:0 0 10px;color:#0a2230">Transparency, Security & Legal Compliance</h3>'
      + '<p style="font-size:13.5px;color:#546e7a;margin:0 0 24px">Every user is protected under our international zero-knowledge covenants.</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">'
      + '<button class="pill" data-act="openlegal" data-v="privacy" style="background:#fff;color:#0a2230;font-weight:700">' + I('shield', 15) + ' Privacy Policy (GDPR / CCPA)</button>'
      + '<button class="pill" data-act="openlegal" data-v="terms" style="background:#fff;color:#0a2230;font-weight:700">' + I('file', 15) + ' Terms of Service</button>'
      + '<button class="pill" data-act="openlegal" data-v="security" style="background:#fff;color:#0a2230;font-weight:700">' + I('lock', 15) + ' Cryptographic Whitepaper</button>'
      + '<button class="pill" data-act="openlegal" data-v="canary" style="background:#fff;color:#0a2230;font-weight:700">' + I('bell', 15) + ' Warrant Canary</button>'
      + '</div>'
      + '</div>'
      + '</section>'

      // 7. Footer
      + '<footer style="background:#0a2230;color:#94aebc;padding:40px 24px;border-top:1px solid #1a3443">'
      + '<div style="max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px">'
      + '<div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      + '<img src="./favicon.svg" width="24" height="24" style="border-radius:6px"/>'
      + '<b style="color:#fff;font-size:18px">jchatt</b>'
      + '</div>'
      + '<div style="font-size:12px;color:#6b8796">© 2026 JChatt Sovereign Systems. Released under open-source license.</div>'
      + '</div>'
      + '<div style="display:flex;gap:18px;font-size:13px">'
      + '<a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener" style="color:#82d82f;text-decoration:none;font-weight:700">GitHub Repository</a>'
      + '<span style="color:#335263">·</span>'
      + '<span style="color:#82d82f;display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:#82d82f"></span> Firebase RTDB Operational</span>'
      + '</div>'
      + '</div>'
      + '</footer>'
      + '</div>';
  }

  global.JCLANDING = {
    LEGAL_DOCS: LEGAL_DOCS,
    renderLegalDoc: renderLegalDoc,
    renderLandingPage: renderLandingPage
  };
})(window);
