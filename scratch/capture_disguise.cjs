const puppeteer = require('./jchatt_web_v2/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8093/web', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => window.go('disguise'));
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'screenshots/screen_disguise_settings.png' });
  console.log('Captured: screen_disguise_settings.png');

  await page.evaluate(() => window.go('warrant-canary'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'screenshots/screen_warrant_canary.png' });
  console.log('Captured: screen_warrant_canary.png');

  await browser.close();
})();
