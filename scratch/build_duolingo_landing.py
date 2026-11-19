import re
import os

source_path = r'C:\Users\jomet\.gemini\antigravity\brain\13e0be15-0669-4013-a057-991a68222973\scratch\duolingo_landing.html'
with open(source_path, 'r', encoding='utf-8') as f:
    full_html = f.read()

# Extract parts
style_match = re.search(r'<style>(.*?)</style>', full_html, re.DOTALL)
css_content = style_match.group(1).strip() if style_match else ''

# Extract body inner HTML between <body> and <script>
body_match = re.search(r'<body>(.*?)<script>', full_html, re.DOTALL)
body_html = body_match.group(1).strip() if body_match else ''

# Ensure .landing-page wrapper has proper scrolling style
# We wrap body_html in a container
escaped_css = css_content.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
escaped_body = body_html.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# Create landing-page.js
js_template = f'''(function (global) {{
  'use strict';

  var DUO_CSS = `{escaped_css}`;

  var LEGAL_DOCS = {{
    privacy: {{
      title: 'Zero-Knowledge Privacy Policy',
      updated: 'November 2026',
      content: [
        {{
          heading: '1. Core Philosophy: Zero Telemetry & Cryptographic Isolation',
          body: 'JChatt is engineered from first principles on a zero-knowledge architecture. Unlike traditional messengers (e.g. WhatsApp, Telegram, or Signal) that require a cellular phone number and upload your personal address book to cloud servers, JChatt requires NO phone number, NO email address, and NO personal identity documents. All identities are derived client-side via cryptographically secure SHA-256 hashes.'
        }},
        {{
          heading: '2. Data Collection Disclosure: What We Do NOT Collect',
          body: '• No Phone Numbers: We never request or store phone numbers.<br>'
            + '• No Contact Book Scraping: We never access, copy, or sync your phone address book.<br>'
            + '• No Location Telemetry: We do not log GPS, IP geolocation, or physical location history.<br>'
            + '• No Advertising Identifiers: We contain zero advertising SDKs, tracking pixels, or third-party analytics trackers.<br>'
            + '• No Plaintext Keys: Your 12-word recovery seed and encryption keys are created solely in client memory and are NEVER transmitted to or stored on our servers.'
        }},
        {{
          heading: '3. End-to-End Cryptography & Data in Transit',
          body: 'All direct messages, group payloads, photo attachments, voice notes, and polls are sealed on the sender device before transit. Real-time signaling is routed via Firebase Realtime Database with strict authorization rules, and peer-to-peer audio/video calling uses WebRTC with DTLS-SRTP media encryption. Plaintext is only decipherable by the intended recipient holding the verified cryptographic keys.'
        }},
        {{
          heading: '4. Ephemeral Retention & Disappearing Timers',
          body: 'Users maintain sovereign control over message lifespans. Configurable timers (10 seconds, 1 hour, 24 hours, 7 days, or burn-after-reading) purge expired messages automatically from client storage and server nodes. 24-hour status stories self-destruct exactly 24 hours after publication.'
        }},
        {{
          heading: '5. GDPR & International Compliance (Regulation EU 2016/679)',
          body: '• Article 5(1)(c) (Data Minimisation): JChatt collects only the cryptographic tokens necessary to route encrypted packets.<br>'
            + '• Article 17 (Right to Erasure / Right to be Forgotten): Users can execute an instant "Burn Account" action in settings. This wipes all user profile records, handles, and conversation pointers from the database permanently.<br>'
            + '• Article 20 (Right to Data Portability): Users can export their local conversation history as encrypted or decrypted JSON at any time.<br>'
            + '• Article 32 (Security of Processing): Cryptographic state separation ensures no unauthorized third party or server administrator can access message content.'
        }},
        {{
          heading: '6. California Consumer Privacy Act (CCPA / CPRA)',
          body: 'We do not sell, rent, or share personal information with third parties for monetary or other valuable consideration. Because we store zero personal identifiers, there is no cross-context behavioral tracking.'
        }},
        {{
          heading: '7. Children\\'s Online Privacy Protection Act (COPPA)',
          body: 'JChatt is not directed to children under 13 years of age. Because the service does not collect names, emails, phone numbers, or demographic data, no personal data from minors is harvested or retained.'
        }},
        {{
          heading: '8. Cryptographic Self-Custody & User Responsibility',
          body: 'You are the sole custodian of your 12-word recovery phrase. If you lose your recovery phrase and sign out or clear your browser data, your account and encrypted history CANNOT be recovered by JChatt, Google, or any third party.'
        }}
      ]
    }},

    terms: {{
      title: 'Terms of Service',
      updated: 'November 2026',
      content: [
        {{
          heading: '1. Agreement to Terms',
          body: 'By accessing or using JChatt (web client at jjcodersjchatt.web.app or native Android application), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the application.'
        }},
        {{
          heading: '2. Acceptable Use Policy',
          body: 'You agree to use JChatt solely for lawful personal and professional communications. You explicitly agree NOT to:<br>'
            + '• Distribute, transmit, or store child sexual abuse material (CSAM). CSAM is strictly prohibited and subject to immediate account termination and law enforcement reporting.<br>'
            + '• Transmit viruses, worms, malware, or destructive code.<br>'
            + '• Engage in unlawful harassment, extortion, death threats, or incitement of imminent violence.<br>'
            + '• Probe, scan, or exploit vulnerabilities in the service infrastructure without written authorization.'
        }},
        {{
          heading: '3. Zero-Knowledge Cryptographic Architecture',
          body: 'You acknowledge and understand that JChatt provides end-to-end cryptographic encryption. Communications are sealed on client devices. You retain full and exclusive responsibility for your 12-word recovery phrase, private keys, and local device security.'
        }},
        {{
          heading: '4. Disclaimer of Warranties',
          body: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, UPTIME GUARANTEES, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE AT ALL TIMES.'
        }},
        {{
          heading: '5. Limitation of Liability',
          body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL JCHATT, ITS AUTHORS, DEVELOPERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR DEVICE DAMAGE ARISING OUT OF YOUR USE OF THE SERVICE. TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED $0 OR THE AMOUNT PAID BY YOU TO USE THE SERVICE.'
        }},
        {{
          heading: '6. Governing Law & Dispute Resolution',
          body: 'These Terms shall be governed by and construed in accordance with the laws of applicable commercial jurisdiction, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms will be brought exclusively in competent arbitration courts.'
        }}
      ]
    }},

    security: {{
      title: 'Cryptographic Security Whitepaper',
      updated: 'November 2026',
      content: [
        {{
          heading: '1. Handle & Password Derivation',
          body: 'When a user registers an ID (e.g. <code>@alex.r</code>), the handle is normalized and hashed client-side using pure JavaScript SHA-256 (FIPS PUB 180-4 compliant). The resulting 64-character hex digest forms a deterministic synthetic identifier, ensuring the server database never contains plain handles or email addresses.'
        }},
        {{
          heading: '2. Recovery Seed & Key Agreement',
          body: 'Accounts are secured by a 12-word BIP-39 compatible mnemonic phrase generated with <code>crypto.getRandomValues()</code>. The phrase combined with the handle derives the private key via PBKDF2-HMAC-SHA256 with high iteration counts, guaranteeing zero plaintext passwords in memory or transit.'
        }},
        {{
          heading: '3. Peer-to-Peer Calling Media Encryption',
          body: 'Voice and video calls connect directly between devices using WebRTC DTLS-SRTP (Datagram Transport Layer Security - Secure Real-time Transport Protocol). Media packets do not pass through application proxy servers, ensuring uncompromised audio confidentiality.'
        }},
        {{
          heading: '4. Disguise Architecture & Camouflage Isolation',
          body: 'JChatt includes a stealth engine allowing the interface to impersonate a fully functional calculator (unlocked by typing <code>314159 =</code>), notes app, or weather widget. A separate 4-digit Duress PIN loads a decoupled decoy database with zero references to real private threads.'
        }}
      ]
    }},

    canary: {{
      title: 'Warrant Canary & Transparency',
      updated: 'November 2026',
      content: [
        {{
          heading: '1. Zero-Retention Warrant Canary',
          body: 'As of November 2026, JChatt confirms:<br>'
            + '• We have received ZERO national security letters (NSLs).<br>'
            + '• We have received ZERO FISA court orders or gag orders.<br>'
            + '• We have installed ZERO backdoors or law enforcement monitoring taps.<br>'
            + '• We have modified ZERO software routines to weaken encryption or leak user keys.'
        }},
        {{
          heading: '2. Technical Incapability to Decrypt',
          body: 'Because JChatt operates on client-side zero-knowledge cryptography, even if served with a court order or subpoena, JChatt cannot produce unencrypted messages, call audio, or private encryption keys. We literally do not possess them.'
        }}
      ]
    }}
  }};

  function renderLegalDoc(docKey) {{
    var doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;
    var sections = doc.content.map(function (sec) {{
      return '<div style="margin-bottom:20px">'
        + '<h3 style="font-size:16px;font-weight:700;color:var(--ink);margin:0 0 6px">' + sec.heading + '</h3>'
        + '<div style="font-size:13.5px;line-height:1.65;color:#334d5c">' + sec.body + '</div>'
        + '</div>';
    }}).join('');

    return '<div class="legal-doc" style="max-width:820px;margin:0 auto;padding:24px 20px 48px;color:var(--ink);font-family:Sora,sans-serif">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d8e2e6;padding-bottom:14px;margin-bottom:20px">'
      + '<div><h1 style="font-size:24px;font-weight:800;letter-spacing:-.03em;margin:0">' + doc.title + '</h1>'
      + '<span style="font-size:12px;color:#6b828f">Effective: ' + doc.updated + ' · JChatt Sovereign Systems</span></div>'
      + '<button class="pill" data-act="closelegal" style="background:var(--in);color:var(--ink);padding:6px 14px;border-radius:12px;cursor:pointer">Close</button>'
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
  }}

  function renderLandingPage(activeLegalModal) {{
    var legalModalHtml = '';
    if (activeLegalModal) {{
      legalModalHtml = '<div class="wscrim" data-act="closelegal" style="z-index:999;position:fixed;inset:0;background:rgba(10,34,48,.6);backdrop-filter:blur(6px)"></div>'
        + '<div class="wmod" style="z-index:1000;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(900px,94vw);max-height:88vh;overflow-y:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 64px rgba(10,34,48,.35)">'
        + renderLegalDoc(activeLegalModal)
        + '</div>';
    }}

    return '<div class="landing-page" style="position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:#ffffff;z-index:50">'
      + '<style>' + DUO_CSS + '</style>'
      + legalModalHtml
      + `{escaped_body}`
      + '</div>';
  }}

  // --- Global Event Delegation for Landing Page Interactivity ---
  var audioCtx = null;
  var activeOscs = [];
  var selectedLifespan = 10;
  var calcInput = '';
  var calcLastOp = '';
  var calcA = null;

  function initInteractions() {{
    document.addEventListener('click', function (e) {{
      var target = e.target;

      // 1. Open Web Navigation Button
      var webBtn = target.closest('#openWebNavBtn, a[href="/web"], [data-act="openweb"]');
      if (webBtn) {{
        e.preventDefault();
        try {{ global.history.pushState(null, '', '/web'); }} catch (err) {{}}
        if (global.JCHATT && global.JCHATT.go) {{
          var isAuth = global.JFE && global.JFE.uid;
          global.JCHATT.go(isAuth ? 'chats' : 'welcome-1', 'push');
        }} else {{
          global.location.href = '/web';
        }}
        return;
      }}

      // 2. Synthesizer Ringback Tone (pure Web Audio API)
      var toneBtn = target.closest('#testToneBtn');
      if (toneBtn) {{
        e.preventDefault();
        if (activeOscs.length) {{
          activeOscs.forEach(function (n) {{ try {{ n.stop(); n.disconnect(); }} catch (err) {{}} }});
          activeOscs = [];
          toneBtn.textContent = 'Hear Ringback Tone';
          return;
        }}
        try {{
          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          audioCtx = audioCtx || new AudioCtx();
          if (audioCtx.state === 'suspended') audioCtx.resume();
          var master = audioCtx.createGain();
          var now = audioCtx.currentTime;
          master.gain.setValueAtTime(0, now);
          master.gain.linearRampToValueAtTime(0.08, now + 0.05);
          master.gain.setValueAtTime(0.08, now + 1.2);
          master.gain.linearRampToValueAtTime(0, now + 1.4);
          master.connect(audioCtx.destination);
          [440, 480].forEach(function (freq) {{
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(master);
            osc.start(now);
            osc.stop(now + 1.5);
            activeOscs.push(osc);
          }});
          activeOscs.push(master);
          toneBtn.textContent = 'Stop Tone ■';
          setTimeout(function () {{
            toneBtn.textContent = 'Hear Ringback Tone';
            activeOscs = [];
          }}, 1500);
        }} catch (err) {{
          console.warn('Web Audio error:', err);
        }}
        return;
      }}

      // 3. Ephemeral Timer Switchers
      var timerBtn = target.closest('.demo-timer-btn');
      if (timerBtn) {{
        e.preventDefault();
        document.querySelectorAll('.demo-timer-btn').forEach(function (b) {{ b.classList.remove('active'); }});
        timerBtn.classList.add('active');
        selectedLifespan = parseInt(timerBtn.getAttribute('data-time'), 10) || 10;
        return;
      }}

      // 4. Ephemeral Demo Clear
      var clearBtn = target.closest('#clearDemoBtn');
      if (clearBtn) {{
        e.preventDefault();
        var msgList = document.getElementById('demoMsgList');
        if (msgList) {{
          msgList.innerHTML = '<div class="mock-chat-bubble in" style="background:#eaf5fc;color:var(--blue-dark);">👋 Playground cleared. All memory wiped!</div>';
        }}
        return;
      }}

      // 5. Calculator Keys
      var calcBtn = target.closest('.calc-b');
      if (calcBtn) {{
        e.preventDefault();
        var cmd = calcBtn.getAttribute('data-calc');
        var calcDisplay = document.getElementById('calcDisplay');
        var calcHistory = document.getElementById('calcHistory');
        if (!calcDisplay) return;

        if (cmd === 'c') {{
          calcInput = '';
          calcA = null;
          calcLastOp = '';
          calcDisplay.textContent = '0';
          if (calcHistory) calcHistory.innerHTML = '&nbsp;';
        }} else if (cmd === '9' || cmd === '8' || cmd === '7' || cmd === '6' || cmd === '5' || cmd === '4' || cmd === '3' || cmd === '2' || cmd === '1' || cmd === '0' || cmd === '.') {{
          calcInput += cmd;
          calcDisplay.textContent = calcInput;
          if (calcInput === '9999') {{
            showModal('duress');
            calcInput = '';
            calcDisplay.textContent = '0';
          }}
        }} else if (cmd === '+' || cmd === '-' || cmd === '*' || cmd === '/') {{
          if (calcInput) {{
            calcA = parseFloat(calcInput);
            calcLastOp = cmd;
            if (calcHistory) calcHistory.textContent = calcA + ' ' + (cmd === '*' ? '×' : (cmd === '/' ? '÷' : cmd));
            calcInput = '';
          }}
        }} else if (cmd === '=') {{
          if (calcInput === '314159') {{
            showModal('vault');
            calcInput = '';
            calcDisplay.textContent = '0';
            if (calcHistory) calcHistory.innerHTML = '&nbsp;';
            return;
          }}
          if (calcA !== null && calcLastOp && calcInput) {{
            var b = parseFloat(calcInput);
            var res = 0;
            if (calcLastOp === '+') res = calcA + b;
            if (calcLastOp === '-') res = calcA - b;
            if (calcLastOp === '*') res = calcA * b;
            if (calcLastOp === '/') res = b !== 0 ? calcA / b : 'Error';
            if (calcHistory) calcHistory.textContent = calcA + ' ' + calcLastOp + ' ' + b + ' =';
            calcDisplay.textContent = String(res);
            calcInput = String(res);
            calcA = null;
            calcLastOp = '';
          }}
        }}
        return;
      }}

      // 6. Modal Openers
      var modalOpener = target.closest('[data-modal]');
      if (modalOpener) {{
        e.preventDefault();
        var key = modalOpener.getAttribute('data-modal');
        showModal(key);
        return;
      }}

      // 7. Modal Closers
      var modalCloser = target.closest('#closeModalBtn, [data-act="close-dialog"]');
      if (modalCloser) {{
        e.preventDefault();
        var dlg = document.getElementById('legalModal');
        if (dlg && dlg.close) dlg.close();
        else if (dlg) dlg.style.display = 'none';
        return;
      }}

      // 8. Mobile Menu Toggle
      var menuToggle = target.closest('#menuToggle');
      if (menuToggle) {{
        e.preventDefault();
        var links = document.getElementById('navLinks');
        if (links) {{
          var open = links.classList.toggle('open');
          menuToggle.setAttribute('aria-expanded', String(open));
        }}
        return;
      }}
    }});

    // Form submit for ephemeral messages demo
    document.addEventListener('submit', function (e) {{
      var form = e.target.closest('#demoForm');
      if (!form) return;
      e.preventDefault();
      var input = document.getElementById('demoInput');
      var msgList = document.getElementById('demoMsgList');
      if (!input || !msgList) return;
      var val = input.value.trim();
      if (!val) return;

      var bubble = document.createElement('div');
      bubble.className = 'mock-chat-bubble out';
      var remain = selectedLifespan;
      bubble.innerHTML = val + '<br><small style="opacity:0.8;font-size:10px;">Self-destructs in <b class="cnt">' + remain + '</b>s</small>';
      msgList.appendChild(bubble);
      msgList.scrollTop = msgList.scrollHeight;
      input.value = '';

      var cntEl = bubble.querySelector('.cnt');
      var interval = setInterval(function () {{
        remain--;
        if (cntEl) cntEl.textContent = remain;
        if (remain <= 0) {{
          clearInterval(interval);
          bubble.style.transition = 'all 0.4s ease';
          bubble.style.opacity = '0';
          bubble.style.transform = 'scale(0.8)';
          bubble.style.filter = 'blur(4px)';
          setTimeout(function () {{ bubble.remove(); }}, 400);
        }}
      }}, 1000);
    }});
  }}

  var modalTexts = {{
    vault: '<h2 style="color:var(--lime-dark);margin-bottom:8px;">🔓 Secret Vault Unlocked</h2><p style="color:var(--ink-muted);font-size:14px;margin-bottom:20px;">Code 314159= accepted. Encrypted client state loaded.</p><div style="padding:16px;background:#f7fbfd;border:2px solid var(--line);border-radius:14px;"><div style="font-weight:800;margin-bottom:6px;">Hidden Conversations (3 active)</div><div style="font-size:13px;color:var(--ink-muted);">• Elena Rostova (Burn-after-reading active)<br>• Sovereign Research Group (Mesh relay)<br>• Offline Emergency Backup Keys</div></div><button class="btn btn-primary" style="margin-top:20px;width:100%;" data-act="close-dialog">Return to Calculator</button>',
    duress: '<h2 style="color:var(--coral-dark);margin-bottom:8px;">⚠️ Duress Mode Activated</h2><p style="color:var(--ink-muted);font-size:14px;margin-bottom:20px;">PIN 9999 accepted. Realistic decoy inbox rendered.</p><div style="padding:16px;background:#fff5f5;border:2px solid #ffd0d0;border-radius:14px;"><div style="font-weight:800;color:var(--coral-dark);margin-bottom:6px;">Decoy Messages (Ordinary Conversations)</div><div style="font-size:13px;color:var(--ink-muted);">• Grocery List (Milk, apples, bread)<br>• Mom (See you on Sunday!)<br>• Book Club Meeting notes</div></div><button class="btn btn-light" style="margin-top:20px;width:100%;" data-act="close-dialog">Close Decoy</button>',
    privacy: '<h2 style="margin-bottom:8px;">Zero-Knowledge Privacy Policy</h2><p style="color:var(--ink-muted);font-size:12px;margin-bottom:20px;">GDPR Articles 5, 17, 20 & CCPA/CPRA Compliant</p><div style="font-size:14px;line-height:1.7;color:#334d5c;"><h3>1. Core Philosophy: Zero Telemetry</h3><p>JChatt is engineered from first principles on a zero-knowledge architecture. Unlike traditional messengers that require cellular phone numbers and scrape your contact graph, JChatt requires NO phone number, NO email address, and NO personal identity documents.</p><h3>2. What We Do NOT Collect</h3><p>• No Phone Numbers: We never request or store phone numbers.<br>• No Contact Book Scraping: We never access, copy, or sync your phone address book.<br>• No Location Telemetry: We do not log GPS, IP geolocation, or physical location history.<br>• No Advertising Identifiers: We contain zero advertising SDKs or tracking pixels.</p><h3>3. Right to Erasure (Burn Account)</h3><p>Users can execute an instant "Burn Account" action in settings to permanently wipe all profile pointers, conversation keys, and associated records from client and cloud nodes.</p></div>',
    terms: '<h2 style="margin-bottom:8px;">Terms of Service</h2><p style="color:var(--ink-muted);font-size:12px;margin-bottom:20px;">Sovereign Cryptographic Architecture Agreement</p><div style="font-size:14px;line-height:1.7;color:#334d5c;"><p>By using JChatt, you acknowledge that cryptographic sovereignty places complete ownership and responsibility for identity keys in the user\\'s hands. JChatt possesses no backdoor, no administrative escrow, and no mechanism to recover forgotten 12-word recovery seeds.</p></div>',
    security: '<h2 style="margin-bottom:8px;">Cryptographic Whitepaper</h2><p style="color:var(--ink-muted);font-size:12px;margin-bottom:20px;">Client-Side Isolation & DTLS-SRTP Transport</p><div style="font-size:14px;line-height:1.7;color:#334d5c;"><p>Direct messages, status stories, and media attachments are sealed on the sender device before transit. WebRTC peer connections utilize DTLS-SRTP media encryption with acoustic echo suppression and pure Web Audio synthesis.</p></div>',
    canary: '<h2 style="margin-bottom:8px;">Warrant Canary</h2><p style="color:var(--ink-muted);font-size:12px;margin-bottom:20px;">Current Status: Clean · November 2026</p><div style="font-size:14px;line-height:1.7;color:#334d5c;"><p>As of November 2026, JChatt Sovereign Systems has received zero national security letters, zero FISA court orders, zero gag orders, and zero backdoor interception requests. Our zero-knowledge architecture ensures that even if compelled, no plaintext messages or contact graphs exist to surrender.</p></div>'
  }};

  function showModal(key) {{
    var dlg = document.getElementById('legalModal');
    var content = document.getElementById('modalContent');
    if (!dlg || !content || !modalTexts[key]) return;
    content.innerHTML = modalTexts[key];
    if (dlg.showModal) {{
      try {{ dlg.showModal(); }} catch (e) {{ dlg.style.display = 'block'; }}
    }} else {{
      dlg.style.display = 'block';
    }}
  }}

  initInteractions();

  global.JCLANDING = {{
    LEGAL_DOCS: LEGAL_DOCS,
    renderLegalDoc: renderLegalDoc,
    renderLandingPage: renderLandingPage
  }};
}})(window);
'''

# Write to target files
targets = [
    r'dist\js\landing-page.js',
    r'jchatt_web_v2\dist\js\landing-page.js',
    r'jchatt_web_v2\public\js\landing-page.js'
]

for t in targets:
    os.makedirs(os.path.dirname(t), exist_ok=True)
    with open(t, 'w', encoding='utf-8') as out:
        out.write(js_template)
    print(f'Wrote {t} ({len(js_template)} chars)')

# Also write duolingo_landing.html to landing.html in dist and jchatt_web_v2/dist
html_targets = [
    r'dist\landing.html',
    r'jchatt_web_v2\dist\landing.html',
    r'jchatt_web_v2\public\landing.html'
]

for ht in html_targets:
    with open(ht, 'w', encoding='utf-8') as out:
        out.write(full_html)
    print(f'Wrote {ht} ({len(full_html)} chars)')
