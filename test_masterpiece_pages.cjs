const puppeteer = require('./jchatt_web_v2/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for jchatt_web_v2/dist
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
  if (reqUrl === '/whitepaper') reqUrl = '/whitepaper.html';
  if (reqUrl === '/compliance') reqUrl = '/compliance.html';

  const filePath = path.join(distDir, reqUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

const PORT = 8089;
server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      errors.push(`Page error: ${err.message}`);
    });

    // 1. Test Landing Page (index.html)
    console.log('\n--- 1. Testing Landing Page (/) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    const pageTitle = await page.title();
    console.log('Landing page title:', pageTitle);

    // Check scroll height
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        htmlOverflow: window.getComputedStyle(document.documentElement).overflow
      };
    });
    console.log('Scroll Info:', scrollInfo);
    if (scrollInfo.scrollHeight > scrollInfo.clientHeight) {
      console.log('✅ Page has natural scroll! (scrollHeight > clientHeight)');
    } else {
      console.warn('⚠️ Warning: Page might not be scrollable!');
    }

    // Scroll to bottom and take a screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'screenshots/masterpiece_landing_full.png', fullPage: true });
    console.log('Saved screenshots/masterpiece_landing_full.png');

    // Test Calculator Demo
    console.log('\n--- Testing Calculator Secret Unlock (314159=) ---');
    const secretBtn = await page.$('button[data-type="314159="]');
    if (secretBtn) {
      await secretBtn.click();
      await new Promise(r => setTimeout(r, 2200));
      const isVaultOpen = await page.evaluate(() => {
        const v = document.getElementById('vReal');
        return v && v.classList.contains('on');
      });
      console.log('Is primary vault open?', isVaultOpen ? '✅ YES' : '❌ NO');
    }

    // 2. Test /privacy
    console.log('\n--- 2. Testing /privacy ---');
    await page.goto(`http://localhost:${PORT}/privacy`, { waitUntil: 'networkidle2' });
    console.log('Privacy title:', await page.title());
    await page.screenshot({ path: 'screenshots/privacy_page.png' });

    // 3. Test /terms
    console.log('\n--- 3. Testing /terms ---');
    await page.goto(`http://localhost:${PORT}/terms`, { waitUntil: 'networkidle2' });
    console.log('Terms title:', await page.title());
    await page.screenshot({ path: 'screenshots/terms_page.png' });

    // 4. Test /whitepaper
    
    // 4b. Test /compliance
    console.log('\n--- Testing /compliance ---');
    await page.goto(`http://localhost:${PORT}/compliance`, { waitUntil: 'networkidle2' });
    console.log('Compliance title:', await page.title());
    await page.screenshot({ path: 'screenshots/compliance_page.png' });

    console.log('\n--- 4. Testing /whitepaper ---');
    await page.goto(`http://localhost:${PORT}/whitepaper`, { waitUntil: 'networkidle2' });
    console.log('Whitepaper title:', await page.title());
    await page.screenshot({ path: 'screenshots/whitepaper_page.png' });

    // 5. Test /web (Web Messenger)
    console.log('\n--- 5. Testing /web (Web Messenger) ---');
    await page.goto(`http://localhost:${PORT}/web`, { waitUntil: 'networkidle2' });
    console.log('Web Messenger title:', await page.title());
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/web_messenger_page.png' });

    console.log('\nTotal logged errors:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    } else {
      console.log('🎉 ZERO errors across all pages!');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
