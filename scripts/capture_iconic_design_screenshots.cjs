const path = require('path');
const puppeteer = require('c:/Users/jomet/Documents/projects/Jchatt/jchatt_web_v2/node_modules/puppeteer');

const ARTIFACT_DIR = 'C:/Users/jomet/.gemini/antigravity/brain/13e0be15-0669-4013-a057-991a68222973';
const WEB_HTML = 'file:///' + path.resolve(__dirname, '../dist/web.html').replace(/\\/g, '/');
const INDEX_HTML = 'file:///' + path.resolve(__dirname, '../dist/index.html').replace(/\\/g, '/');

async function capture() {
  console.log('Launching Puppeteer to capture iconic design screenshots...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 890, deviceScaleFactor: 2 });

  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // 1. Capture Onboarding Step 1
  console.log('Capturing Onboarding Step 1 (welcome-1)...');
  await page.goto(WEB_HTML, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    if (window.JCHATT && window.JCHATT.go) {
      window.JCHATT.go('welcome-1');
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'duo_onboarding_step1.png'), fullPage: false });

  // 2. Capture Onboarding Step 2 & Create ID
  console.log('Capturing Onboarding Step 2 (welcome-2) & Create ID...');
  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) window.JCHATT.go('welcome-2');
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'duo_onboarding_step2.png'), fullPage: false });

  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) window.JCHATT.go('create-id');
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'duo_create_id.png'), fullPage: false });

  // 3. Capture Recovery Seed Backup
  console.log('Capturing Recovery Seed Backup (recovery-phrase)...');
  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) window.JCHATT.go('recovery-phrase');
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'duo_recovery_seed.png'), fullPage: false });

  // 3b. Capture Account Ready
  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) window.JCHATT.go('account-ready');
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'duo_account_ready.png'), fullPage: false });

  // 4. Capture Clean Chats Inbox & Highlighted Search (with realistic decrypted preview threads)
  console.log('Capturing Chats Inbox & Search...');
  await page.evaluate(() => {
    const Engine = window.JFE;
    if (Engine) {
      const now = Date.now();
      Engine.chats = {
        demo_nora: {
          id: 'demo_nora',
          name: 'Nora Lindstrom',
          handle: '@nora.sec',
          kind: 'dm',
          unread: 2,
          lastTs: now - 120000,
          lastText: 'Rotated our Double Ratchet keypair locally.'
        },
        demo_kai: {
          id: 'demo_kai',
          name: 'Kai Sato',
          handle: '@kai.arch',
          kind: 'dm',
          unread: 0,
          lastTs: now - 900000,
          lastText: 'Verified the signed voice note transcript.'
        },
        demo_ops: {
          id: 'demo_ops',
          name: 'Field Research Group',
          handle: '#field.ops',
          kind: 'group',
          unread: 0,
          lastTs: now - 3600000,
          lastText: 'Shared offline safety checklist PDF.'
        }
      };
      Engine.messagesByChat = {
        demo_nora: {
          m1: { id: 'm1', sender: 'peer', text: 'Rotated our Double Ratchet keypair locally.', ts: now - 120000 }
        },
        demo_kai: {
          m2: { id: 'm2', sender: 'peer', text: 'Forward ratchet check completed on both devices.', ts: now - 900000 }
        }
      };
    }
    if (window.JCHATT && window.JCHATT.go) {
      window.JCHATT.LV.settings.onboarded = true;
      window.JCHATT.go('chats');
    }
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'chats_inbox_clean.png'), fullPage: false });

  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) {
      window.JCHATT.LV.searchQ = 'Ratchet';
      window.JCHATT.LV.searchFilter = 'all';
      window.JCHATT.go('search');
    }
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'airbnb_search_chats.png'), fullPage: false });

  // 5. Capture Global Command Palette Overlay (⌘K) over Chats
  console.log('Capturing Command Palette Overlay over Chats...');
  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) {
      window.JCHATT.go('chats');
      if (window.JCHATT.ACT && window.JCHATT.ACT.open_cmd_palette) {
        window.JCHATT.ACT.open_cmd_palette();
      }
    }
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'linear_cmd_palette.png'), fullPage: false });

  // Verify Escape closes command palette cleanly
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 250));

  // 6. Capture Minimalist Settings (Light), Shield Telemetry, and Settings (Dark)
  console.log('Capturing Settings & Shield Telemetry...');
  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) window.JCHATT.go('settings');
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notion_settings_aesop.png'), fullPage: false });

  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.go) {
      window.JCHATT.go('shield');
      window.JCHATT.LV.shieldExpanded = true;
      window.JCHATT.render();
    }
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shield_telemetry.png'), fullPage: false });

  await page.evaluate(() => {
    if (window.JCHATT && window.JCHATT.ACT && window.JCHATT.ACT.toggle_theme) {
      window.JCHATT.ACT.toggle_theme();
      window.JCHATT.go('settings');
    }
  });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'settings_dark_mode.png'), fullPage: false });

  // 7. Capture Landing Page Hero + Interactive Preview Tabs (Desktop)
  console.log('Capturing Desktop Landing Page Hero...');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto(INDEX_HTML, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stripe_landing_page.png'), fullPage: false });

  console.log('Testing Interactive Calc Disguise on Landing Page...');
  await page.click('[data-demo="calc"]');
  for (const key of ['3', '1', '4', '1', '5', '9', '=']) {
    await page.click(`[data-ck="${key}"]`);
  }
  const calcResult = await page.$eval('#demo-calc-disp', el => el.textContent.trim());
  console.log('Landing calc demo display:', calcResult);
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing_interactive_demo.png'), fullPage: false });

  await browser.close();
  console.log('Console errors count:', consoleErrors.length, consoleErrors);
  console.log('All refreshed screenshots captured successfully in artifact directory!');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
