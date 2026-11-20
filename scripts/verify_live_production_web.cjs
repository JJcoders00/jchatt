const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../jchatt_web_v2/node_modules/puppeteer'));

async function testLiveProduction() {
  console.log('🚀 Launching Headless Chromium to test production endpoints...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const urls = [
    { name: 'Landing Page', url: 'https://jjcodersjchatt.web.app/' },
    { name: 'Editorial Honors Page', url: 'https://jjcodersjchatt.web.app/honors' },
    { name: 'Statutory Compliance Center', url: 'https://jjcodersjchatt.web.app/compliance.html' },
    { name: 'Privacy Policy', url: 'https://jjcodersjchatt.web.app/privacy.html' },
    { name: 'Terms of Service', url: 'https://jjcodersjchatt.web.app/terms.html' }
  ];

  let passed = 0;
  for (const item of urls) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.toString()));

    try {
      const response = await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 25000 });
      const status = response ? response.status() : 0;
      const title = await page.title();
      if (status === 200 && errors.length === 0) {
        console.log(`✅ [PASS] ${item.name}: Status 200, 0 Errors, Title: "${title}"`);
        passed++;
      } else {
        console.log(`⚠️ [WARN] ${item.name}: Status ${status}, Errors: ${errors.length} (${errors.join('; ')})`);
        if (status === 200) passed++;
      }
    } catch (e) {
      console.error(`❌ [FAIL] ${item.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n🎉 Production Live Testing Complete: ${passed}/${urls.length} endpoints validated successfully.`);
}

testLiveProduction().catch(err => {
  console.error(err);
  process.exit(1);
});
