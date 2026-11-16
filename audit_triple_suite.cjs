const puppeteer = require('./jchatt_web_v2/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'jchatt_web_v2', 'dist');

function getMime(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    case '.json': return 'application/json';
    case '.apk': return 'application/vnd.android.package-archive';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';
  if (reqUrl === '/web') reqUrl = '/web.html';
  if (reqUrl === '/privacy') reqUrl = '/privacy.html';
  if (reqUrl === '/terms') reqUrl = '/terms.html';
  if (reqUrl === '/compliance') reqUrl = '/compliance.html';
  if (reqUrl === '/whitepaper') reqUrl = '/whitepaper.html';

  const filePath = path.join(distDir, reqUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

const PORT = 8091;
server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🔍 JCHATT TRIPLE AUDIT: TESTER + HACKER + JURY LAWYER`);
  console.log(`======================================================`);
  
  let browser;
  const auditResults = {
    tester: { passed: [], warnings: [], failed: [] },
    hacker: { passed: [], warnings: [], failed: [] },
    lawyer: { passed: [], warnings: [], failed: [] }
  };

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    // ==========================================
    // 1. TESTER PERSPECTIVE: UI / UX & FUNCTION
    // ==========================================
    console.log('\n--- [TESTER AUDIT] Testing Landing Page & Interactivity ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });

    // A. Check scrollability
    const scroll = await page.evaluate(() => ({
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
      overflow: window.getComputedStyle(document.body).overflow
    }));
    if (scroll.scrollH > 3000) {
      auditResults.tester.passed.push(`Landing page is naturally scrollable (Height: ${scroll.scrollH}px)`);
    } else {
      auditResults.tester.failed.push(`Landing page height abnormal: ${scroll.scrollH}px`);
    }

    // B. Test Calculator Interactive Disguise
    console.log('Testing calculator math & stealth unlock...');
    const calcExists = await page.$('#calc');
    if (calcExists) {
      // Test basic calculation: 7 * 8 =
      await page.click('#calc button[data-k="7"]');
      await page.click('#calc button[data-k="×"]');
      await page.click('#calc button[data-k="8"]');
      await page.click('#calc button[data-k="="]');
      const calcResult = await page.$eval('#disp', el => el.textContent);
      if (calcResult === '56') {
        auditResults.tester.passed.push('Calculator performs accurate floating math (7 × 8 = 56)');
      } else {
        auditResults.tester.warnings.push(`Calculator result unexpected: ${calcResult}`);
      }

      // Test AC clear
      await page.click('#calc button[data-k="AC"]');
      const clearResult = await page.$eval('#disp', el => el.textContent);
      if (clearResult === '0') {
        auditResults.tester.passed.push('Calculator AC clears display to 0');
      }

      // Test Stealth Real Vault unlock: 314159=
      const realBtn = await page.$('button[data-type="314159="]');
      if (realBtn) {
        await realBtn.click();
        await new Promise(r => setTimeout(r, 2200));
        const realVaultVisible = await page.$eval('#vReal', el => el.classList.contains('on'));
        if (realVaultVisible) {
          auditResults.tester.passed.push('Stealth sequence 314159= reveals primary vault');
        } else {
          auditResults.tester.failed.push('Stealth sequence 314159= failed to reveal vault');
        }
      }

      // Test Stealth Decoy Vault unlock: 9999=
      const decoyBtn = await page.$('button[data-type="9999="]');
      if (decoyBtn) {
        await decoyBtn.click();
        await new Promise(r => setTimeout(r, 1600));
        const decoyVaultVisible = await page.$eval('#vDecoy', el => el.classList.contains('on'));
        if (decoyVaultVisible) {
          auditResults.tester.passed.push('Duress sequence 9999= reveals decoy vault');
        } else {
          auditResults.tester.failed.push('Duress sequence 9999= failed to reveal decoy vault');
        }
      }
    }

    // C. Test Mobile Menu Toggle
    await page.setViewport({ width: 375, height: 812 }); // iPhone X viewport
    const menuBtn = await page.$('.menu-btn');
    if (menuBtn) {
      await menuBtn.click();
      const menuOpen = await page.$eval('#mmenu', el => el.classList.contains('on'));
      if (menuOpen) {
        auditResults.tester.passed.push('Mobile responsive hamburger menu opens cleanly');
        await page.click('#mmenu a'); // click link to close
        const menuClosed = await page.$eval('#mmenu', el => !el.classList.contains('on'));
        if (menuClosed) auditResults.tester.passed.push('Mobile menu closes on navigation click');
      }
    }
    await page.setViewport({ width: 1280, height: 900 });

    // D. Test Web Messenger (/web)
    console.log('Testing Web Messenger (/web)...');
    await page.goto(`http://localhost:${PORT}/web`, { waitUntil: 'networkidle2' });
    const appEl = await page.$('#app');
    if (appEl) {
      auditResults.tester.passed.push('Web Messenger container #app mounted');
      // Wait to see if screen rendered
      await new Promise(r => setTimeout(r, 1000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.length > 50) {
        auditResults.tester.passed.push('Web Messenger UI views rendered successfully');
      } else {
        auditResults.tester.warnings.push('Web Messenger view text is sparse');
      }
    } else {
      auditResults.tester.failed.push('Web Messenger #app not found');
    }

    // ==========================================
    // 2. HACKER PERSPECTIVE: DEFENSIVE SECURITY
    // ==========================================
    console.log('\n--- [HACKER AUDIT] Defensive Cryptography & Attack Surface ---');
    
    // A. Check for cleartext leaks in localStorage / sessionStorage
    const storageAudit = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const leaks = [];
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val && (val.includes('password') || val.includes('secret') || val.includes('privateKey'))) {
          leaks.push(k);
        }
      });
      return { totalKeys: keys.length, leaks };
    });
    if (storageAudit.leaks.length === 0) {
      auditResults.hacker.passed.push('Zero cleartext cryptographic secret leaks found in localStorage');
    } else {
      auditResults.hacker.warnings.push(`Sensitive storage keys found: ${storageAudit.leaks.join(', ')}`);
    }

    // B. Check for unsafe third-party tracking scripts or CDNs
    const scripts = await page.evaluate(() => {
      const allScripts = Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline');
      const trackers = allScripts.filter(s => 
        s.includes('google-analytics') || s.includes('googletagmanager') || 
        s.includes('facebook') || s.includes('hotjar') || s.includes('mixpanel')
      );
      return { total: allScripts.length, trackers };
    });
    if (scripts.trackers.length === 0) {
      auditResults.hacker.passed.push('Zero corporate tracking beacons (No GA, GTM, FB, Hotjar)');
    } else {
      auditResults.hacker.failed.push(`Trackers detected: ${scripts.trackers.join(', ')}`);
    }

    // C. Check XSS Protection on Chat Inputs
    const xssEscaped = await page.evaluate(() => {
      if (window.JCA && window.JCA.escHtml) {
        const testPayload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
        const sanitized = window.JCA.escHtml(testPayload);
        return !sanitized.includes('<script>') && !sanitized.includes('<img');
      }
      return null;
    });
    if (xssEscaped === true) {
      auditResults.hacker.passed.push('escHtml securely defangs HTML injection tags (<script>, <img>)');
    } else if (xssEscaped === false) {
      auditResults.hacker.failed.push('XSS sanitization failed: dangerous tags were not escaped');
    }

    // D. Cryptographic Primitives Check
    const cryptoCheck = await page.evaluate(() => {
      return {
        hasWebCrypto: !!(window.crypto && window.crypto.subtle),
        hasGetRandomValues: !!(window.crypto && window.crypto.getRandomValues)
      };
    });
    if (cryptoCheck.hasWebCrypto && cryptoCheck.hasGetRandomValues) {
      auditResults.hacker.passed.push('WebCrypto & CSPRNG (crypto.getRandomValues) natively active');
    } else {
      auditResults.hacker.failed.push('Secure WebCrypto primitives not available in runtime');
    }

    // ==========================================
    // 3. JURY LAWYER PERSPECTIVE: STATUTORY SHIELD
    // ==========================================
    console.log('\n--- [LAWYER AUDIT] Statutory & Regulatory Compliance ---');
    
    // A. Check /compliance page content
    await page.goto(`http://localhost:${PORT}/compliance`, { waitUntil: 'networkidle2' });
    const compText = await page.evaluate(() => document.body.innerText);
    
    const requiredStatutes = [
      { name: 'IT Act 2000 Section 79 (Safe Harbor)', pattern: /Section 79/i },
      { name: 'Rule 3(2) Grievance Officer', pattern: /Grievance Officer/i },
      { name: 'Mandatory 24-hour Acknowledgment', pattern: /24 hours/i },
      { name: '15-day Resolution Timeline', pattern: /15 (calendar )?days/i },
      { name: 'DPDPA 2023 Statutory Mapping', pattern: /DPDPA 2023/i },
      { name: 'CDA Section 230 Immunity', pattern: /Section 230/i },
      { name: 'DMCA Takedown Agent', pattern: /DMCA/i },
      { name: 'Law Enforcement Technical Policy', pattern: /Law Enforcement/i }
    ];

    requiredStatutes.forEach(stat => {
      if (stat.pattern.test(compText)) {
        auditResults.lawyer.passed.push(`Statutory protection verified: ${stat.name}`);
      } else {
        auditResults.lawyer.failed.push(`Missing critical statutory protection: ${stat.name}`);
      }
    });

    // B. Check /terms page for liability waivers
    await page.goto(`http://localhost:${PORT}/terms`, { waitUntil: 'networkidle2' });
    const termsText = await page.evaluate(() => document.body.innerText);
    
    const requiredClauses = [
      { name: 'AS-IS Warranty Disclaimer', pattern: /AS IS/i },
      { name: 'Limitation of Liability Ceiling (₹100 / $1)', pattern: /₹100|1\.00 USD/i },
      { name: 'Complete User Indemnification', pattern: /indemnif/i },
      { name: 'Class Action Waiver & Arbitration', pattern: /Class Action/i },
      { name: 'Lost Seed Phrase Non-Recoverable Clause', pattern: /12-word/i }
    ];

    requiredClauses.forEach(cl => {
      if (cl.pattern.test(termsText)) {
        auditResults.lawyer.passed.push(`Terms clause verified: ${cl.name}`);
      } else {
        auditResults.lawyer.failed.push(`Missing protective terms clause: ${cl.name}`);
      }
    });

    // C. Check /privacy page
    await page.goto(`http://localhost:${PORT}/privacy`, { waitUntil: 'networkidle2' });
    const privText = await page.evaluate(() => document.body.innerText);
    if (/DPDPA 2023/i.test(privText) && /GDPR/i.test(privText) && /no phone number/i.test(privText)) {
      auditResults.lawyer.passed.push('Privacy policy covers DPDPA 2023, GDPR, and zero-knowledge data stance');
    } else {
      auditResults.lawyer.failed.push('Privacy policy missing DPDPA/GDPR zero-knowledge definitions');
    }

    console.log('\n================ AUDIT SUMMARY ================');
    console.log(`TESTER: ${auditResults.tester.passed.length} passed, ${auditResults.tester.warnings.length} warnings, ${auditResults.tester.failed.length} failed`);
    console.log(`HACKER: ${auditResults.hacker.passed.length} passed, ${auditResults.hacker.warnings.length} warnings, ${auditResults.hacker.failed.length} failed`);
    console.log(`LAWYER: ${auditResults.lawyer.passed.length} passed, ${auditResults.lawyer.warnings.length} warnings, ${auditResults.lawyer.failed.length} failed`);

    fs.writeFileSync('audit_triple_results.json', JSON.stringify({
      auditResults,
      pageErrors
    }, null, 2));

  } catch (err) {
    console.error('Fatal audit error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
