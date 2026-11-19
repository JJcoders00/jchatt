const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../jchatt_web_v2/node_modules/puppeteer'));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const filePath = 'file:///' + path.resolve(__dirname, '../dist/honors.html').replace(/\\/g, '/');
  console.log('Navigating to:', filePath);
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Take screenshot of hero and top manifesto
  await page.screenshot({
    path: path.resolve(__dirname, '../honors_editorial_hero_proof.png'),
    clip: { x: 0, y: 0, width: 1440, height: 1600 }
  });

  // Scroll to exhibitions and take screenshot of the exhibitions
  await page.evaluate(() => {
    const el = document.getElementById('exhibitions');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: path.resolve(__dirname, '../honors_editorial_exhibitions_proof.png'),
    clip: { x: 0, y: 1450, width: 1440, height: 1800 }
  });

  console.log('Screenshots captured successfully!');
  await browser.close();
})();
