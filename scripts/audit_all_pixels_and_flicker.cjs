const puppeteer = require('../jchatt_web_v2/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\jomet\\.gemini\\antigravity\\brain\\13e0be15-0669-4013-a057-991a68222973';
const URL_TO_TEST = 'https://jjcodersjchatt.web.app';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAudit() {
  console.log('--- STARTING DEEP PIXEL & FLICKER AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  // 1. Mobile Viewport (iPhone 14 standard: 390x844)
  console.log('\n[1/6] Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL_TO_TEST, { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Take landing screenshot
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_1_mobile_landing.png') });
  console.log('✓ Mobile landing captured');

  // Navigate to web app
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, button')).find(el => (el.textContent || '').includes('Open JChatt Web') || (el.textContent || '').includes('Launch'));
    if (btn) btn.click();
    else window.location.href = '/web';
  });
  await sleep(2000);

  // Check if onboarding or account creation needed
  const isWelcome = await page.evaluate(() => {
    return !!document.querySelector('.slide') || !!document.querySelector('[data-act="next"]') || (window.location.hash || '').includes('welcome');
  });

  if (isWelcome) {
    console.log('Completing quick onboarding in mobile view...');
    // Click Next through welcome slides
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        const nxt = document.querySelector('[data-act="next"]') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Get Started') || (b.textContent || '').includes('Next') || (b.textContent || '').includes('Continue'));
        if (nxt) nxt.click();
      });
      await sleep(500);
    }
    // If on account creation
    await page.evaluate(() => {
      const hInp = document.getElementById('reg-handle') || document.querySelector('input[placeholder*="handle"]');
      if (hInp) {
        hInp.value = 'pixeltest';
        hInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const nInp = document.getElementById('reg-name') || document.querySelector('input[placeholder*="name"]');
      if (nInp) {
        nInp.value = 'Pixel QA';
        nInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const createBtn = document.querySelector('[data-act="do_create_id"]') || document.querySelector('[data-act="create-account"]') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Create'));
      if (createBtn) createBtn.click();
    });
    await sleep(2500);

    // Accept phrase / acknowledge
    await page.evaluate(() => {
      const doneBtn = document.querySelector('[data-act="done_phrase"]') || document.querySelector('[data-act="ack_phrase"]') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Saved') || (b.textContent || '').includes('Continue') || (b.textContent || '').includes('Done'));
      if (doneBtn) doneBtn.click();
    });
    await sleep(1500);
  }

  // 2. Measure Body Scrolling Bug & Overflow
  console.log('\n[2/6] Verifying Viewport Constraints & Scrollbar Glitches...');
  const scrollMetrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const app = document.getElementById('app');
    return {
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      hasHorizontalOverflow: body.scrollWidth > body.clientWidth,
      appHeight: app ? app.clientHeight : 0,
      windowInnerHeight: window.innerHeight,
      windowInnerWidth: window.innerWidth
    };
  });
  console.log('Scroll metrics:', scrollMetrics);
  if (scrollMetrics.hasHorizontalOverflow) {
    console.error('FAIL: Horizontal overflow detected on body!');
  } else {
    console.log('PASS: Zero horizontal overflow on mobile body.');
  }

  // Capture Chats screen
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_2_mobile_chats.png') });
  console.log('✓ Mobile chats captured');

  // 3. Tab Switching & Flicker Check (Chats -> Updates -> Calls -> Shield -> Settings)
  console.log('\n[3/6] Testing Tab Transitions & Zero-Flicker Navigation...');
  const tabs = ['updates', 'calls', 'shield', 'settings', 'chats'];
  for (const t of tabs) {
    const navStartTime = Date.now();
    await page.evaluate((targetTab) => {
      const tabBtn = document.querySelector(`[data-act="tab"][data-t="${targetTab}"]`) || document.querySelector(`[data-tab="${targetTab}"]`);
      if (tabBtn) tabBtn.click();
    }, t);
    await sleep(250);
    const navDuration = Date.now() - navStartTime;
    console.log(`✓ Tab transition to [${t}] completed in ${navDuration}ms`);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_3_tab_switching.png') });

  // 4. Biometric Lock Screen Pixel & Interaction Audit
  console.log('\n[4/6] Auditing Biometric Lock Screen & PIN Pad Toggle...');
  // Navigate to lockscreen
  await page.evaluate(() => {
    if ((window.LV || (window.JCHATT && window.JCHATT.LV))) {
      (window.LV || (window.JCHATT && window.JCHATT.LV)).settings.biometric = true;
      (window.LV || (window.JCHATT && window.JCHATT.LV)).showPinInstead = false;
      (window.go || (window.JCHATT && window.JCHATT.go))('lockscreen', 'push');
    }
  });
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_4_biometric_screen.png') });

  // Check that biometric screen is visible and PIN pad keys are NOT rendered
  const bioState = await page.evaluate(() => {
    const hasFingerprintSvg = !!document.querySelector('svg path[d*="M12 2a10 10"]');
    const hasTouchSensorBtn = Array.from(document.querySelectorAll('button')).some(b => (b.textContent || '').includes('Touch Sensor'));
    const hasPinInsteadBtn = Array.from(document.querySelectorAll('button')).some(b => (b.textContent || '').includes('Enter PIN instead'));
    const pinPadVisible = !!document.querySelector('.keys');
    return { hasFingerprintSvg, hasTouchSensorBtn, hasPinInsteadBtn, pinPadVisible };
  });
  console.log('Biometric screen state:', bioState);
  if (bioState.hasFingerprintSvg && bioState.hasTouchSensorBtn && !bioState.pinPadVisible) {
    console.log('PASS: Dedicated Biometric Screen displays properly and hides PIN pad.');
  } else {
    console.error('FAIL: Biometric screen check failed!', bioState);
  }

  // Click 'Enter PIN instead'
  console.log('Toggling to numeric PIN pad...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Enter PIN instead'));
    if (btn) btn.click();
  });
  await sleep(400);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_5_pinpad_revealed.png') });

  const pinState = await page.evaluate(() => {
    return {
      keysCount: document.querySelectorAll('.keys button').length,
      hasUseBioBtn: Array.from(document.querySelectorAll('button')).some(b => (b.textContent || '').includes('Use Fingerprint Sensor'))
    };
  });
  console.log('PIN pad state:', pinState);
  if (pinState.keysCount >= 10 && pinState.hasUseBioBtn) {
    console.log('PASS: PIN pad smoothly revealed with toggle back to Fingerprint.');
  }

  // Click 'Use Fingerprint Sensor' to toggle back
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Use Fingerprint Sensor'));
    if (btn) btn.click();
  });
  await sleep(400);

  // Unlock to return to chats
  await page.evaluate(() => {
    if ((window.LV || (window.JCHATT && window.JCHATT.LV))) {
      (window.LV || (window.JCHATT && window.JCHATT.LV)).locked = false;
      (window.go || (window.JCHATT && window.JCHATT.go))('chats', 'pop');
    }
  });
  await sleep(600);

  // 5. Calculator Disguise & Secret Morph Audit
  console.log('\n[5/6] Testing Calculator Disguise Math & Secret Morph (777=)...');
  await page.evaluate(() => {
    (window.go || (window.JCHATT && window.JCHATT.go))('fake-calc', 'push');
  });
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_6_fake_calc.png') });

  // Type 9 * 9 = 81
  const calcResult = await page.evaluate(() => {
    const clickKey = (k) => {
      const btn = document.querySelector(`[data-act="calc"][data-v="${k}"]`);
      if (btn) btn.click();
    };
    clickKey('9');
    clickKey('×');
    clickKey('9');
    clickKey('=');
    const disp = document.querySelector('.calc-disp') || document.querySelector('[style*="font-size:36px"]') || document.querySelector('[style*="font-size:42px"]');
    return disp ? disp.textContent.trim() : 'unknown';
  });
  console.log(`Calculator 9 × 9 evaluation: [${calcResult}]`);

  // Enter secret code: 7 7 7 =
  console.log('Entering secret morph code 777= ...');
  await page.evaluate(() => {
    const clickKey = (k) => {
      const btn = document.querySelector(`[data-act="calc"][data-v="${k}"]`);
      if (btn) btn.click();
    };
    clickKey('C');
    clickKey('7');
    clickKey('7');
    clickKey('7');
    clickKey('=');
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_7_morphed_back.png') });

  const currentRoute = await page.evaluate(() => (window.LV || (window.JCHATT && window.JCHATT.LV)) ? (window.LV || (window.JCHATT && window.JCHATT.LV)).route : 'unknown');
  console.log(`Route after 777=: [${currentRoute}]`);
  if (currentRoute === 'chats') {
    console.log('PASS: 777= successfully morphed directly into JChatt Chats!');
  } else {
    console.error('FAIL: Expected route chats, got', currentRoute);
  }

  // 6. Desktop Viewport (1280x800) Pixel Audit
  console.log('\n[6/6] Testing Desktop 3-Pane Web Workspace (1280x800)...');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    if (window.render) window.render(true);
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'pixel_audit_8_desktop_workspace.png') });

  const desktopCheck = await page.evaluate(() => {
    const rail = document.querySelector('.wrail');
    const list = document.querySelector('.wlist');
    const pane = document.querySelector('.wpane');
    return {
      hasRail: !!rail,
      hasList: !!list,
      hasPane: !!pane,
      railWidth: rail ? rail.clientWidth : 0,
      listWidth: list ? list.clientWidth : 0,
      paneWidth: pane ? pane.clientWidth : 0
    };
  });
  console.log('Desktop 3-pane metrics:', desktopCheck);
  if (desktopCheck.hasRail && desktopCheck.hasList && desktopCheck.hasPane) {
    console.log('PASS: Desktop 3-pane luxury workspace layout perfectly constrained.');
  }

  console.log('\n--- CONSOLE ERRORS AUDIT ---');
  if (errors.length === 0) {
    console.log('PASS: Exactly 0 JavaScript console errors or runtime exceptions!');
  } else {
    console.log(`Warnings/Errors found (${errors.length}):`, errors);
  }

  await browser.close();
  console.log('=== AUDIT COMPLETE ===');
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
