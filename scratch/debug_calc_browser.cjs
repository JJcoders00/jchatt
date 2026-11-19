const puppeteer = require('../jchatt_web_v2/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:8089/', { waitUntil: 'networkidle2' });

  console.log('Clicking 7...');
  await page.click('#calc button[data-k="7"]');
  console.log('Disp:', await page.$eval('#disp', el => el.textContent));

  console.log('Clicking ×...');
  await page.click('#calc button[data-k="×"]');
  console.log('Disp:', await page.$eval('#disp', el => el.textContent));

  console.log('Clicking 8...');
  await page.click('#calc button[data-k="8"]');
  console.log('Disp:', await page.$eval('#disp', el => el.textContent));

  console.log('Clicking =...');
  await page.click('#calc button[data-k="="]');
  console.log('Disp:', await page.$eval('#disp', el => el.textContent));

  await browser.close();
})();
