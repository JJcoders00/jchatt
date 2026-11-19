const puppeteer = require('../jchatt_web_v2/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'jchatt_web_v2', 'dist');

function getMime(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/' || reqUrl === '/web') reqUrl = '/web.html';
  const filePath = path.join(distDir, reqUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(distDir, 'web.html')).pipe(res);
  }
});

server.listen(8095, async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8095/web', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => window.go('disguise'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'screenshots/screen_disguise_settings.png' });

  await page.evaluate(() => window.go('warrant-canary'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'screenshots/screen_warrant_canary.png' });

  await browser.close();
  server.close();
  console.log('Screenshots saved!');
});
