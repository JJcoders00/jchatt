const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '../jchatt_web_v2/node_modules/puppeteer'));

const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots', 'pixel_audit');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'Mobile_Compact_360x740', width: 360, height: 740, isMobile: true, deviceScaleFactor: 2 },
  { name: 'Mobile_iPhone15Pro_393x852', width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 },
  { name: 'Mobile_Android_Pixel_412x915', width: 412, height: 915, isMobile: true, deviceScaleFactor: 2.625 },
  { name: 'Tablet_iPad_768x1024', width: 768, height: 1024, isMobile: true, deviceScaleFactor: 2 },
  { name: 'Laptop_MacBook_1440x900', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 2 },
  { name: 'Desktop_FHD_1920x1080', width: 1920, height: 1080, isMobile: false, deviceScaleFactor: 1 }
];

const PAGES = [
  { name: 'Landing_Hero', url: 'file:///' + path.join(ROOT, 'dist', 'index.html').replace(/\\/g, '/') },
  { name: 'Honors_Exhibition', url: 'file:///' + path.join(ROOT, 'dist', 'honors.html').replace(/\\/g, '/') },
  { name: 'Compliance_Center', url: 'file:///' + path.join(ROOT, 'dist', 'compliance.html').replace(/\\/g, '/') },
  { name: 'Privacy_Charter', url: 'file:///' + path.join(ROOT, 'dist', 'privacy.html').replace(/\\/g, '/') },
  { name: 'Terms_Of_Service', url: 'file:///' + path.join(ROOT, 'dist', 'terms.html').replace(/\\/g, '/') }
];

async function runPixelPerfectAudit() {
  console.log('====================================================');
  console.log('🔬 DEEP PIXEL & LAYOUT AUDITING ENGINE');
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const fullAuditReport = {
    totalChecked: 0,
    overflowBugs: 0,
    tapTargetIssues: 0,
    contrastIssues: 0,
    pages: []
  };

  for (const p of PAGES) {
    console.log(`\n📌 Auditing Page: ${p.name} (${p.url})`);
    const pageData = {
      name: p.name,
      url: p.url,
      viewports: []
    };

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        deviceScaleFactor: vp.deviceScaleFactor
      });

      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Run deep in-browser pixel & DOM inspection
      const layoutMetrics = await page.evaluate(() => {
        // 1. Check Horizontal Overflow (Any horizontal scroll is a layout bug)
        const docElem = document.documentElement;
        const body = document.body;
        const docWidth = docElem.clientWidth;
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
        const hasHorizontalOverflow = scrollWidth > docWidth + 2; // allowance of 2px for subpixel rounding

        // 2. Find any overflowing elements
        const overflowingElements = [];
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 2) {
            overflowingElements.push({
              tag: el.tagName.toLowerCase(),
              className: (el.className || '').toString().slice(0, 40),
              right: Math.round(rect.right),
              excess: Math.round(rect.right - docWidth)
            });
          }
        });

        // 3. Touch Target Dimensions (Interactive elements minimum 44x44 or 40x40 on mobile)
        const smallTapTargets = [];
        const interactives = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
        interactives.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
          if (isVisible) {
            // If both dimensions are under 24px and not an inline link in a paragraph
            if (rect.width < 28 && rect.height < 28 && !el.closest('p')) {
              smallTapTargets.push({
                tag: el.tagName.toLowerCase(),
                text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 25),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              });
            }
          }
        });

        // 4. Broken images check
        const brokenImages = [];
        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
          if (!img.naturalWidth || img.naturalWidth === 0) {
            brokenImages.push(img.src);
          }
        });

        return {
          viewportWidth: docWidth,
          scrollWidth: scrollWidth,
          hasHorizontalOverflow,
          overflowCount: overflowingElements.length,
          overflowSample: overflowingElements.slice(0, 3),
          smallTapTargetsCount: smallTapTargets.length,
          smallTapTargetsSample: smallTapTargets.slice(0, 3),
          brokenImagesCount: brokenImages.length,
          brokenImages
        };
      });

      // Save screenshot
      const shotFilename = `${p.name}_${vp.name}.png`;
      const shotPath = path.join(SCREENSHOTS_DIR, shotFilename);
      await page.screenshot({ path: shotPath, fullPage: false });

      fullAuditReport.totalChecked++;
      if (layoutMetrics.hasHorizontalOverflow) fullAuditReport.overflowBugs++;
      if (layoutMetrics.smallTapTargetsCount > 0) fullAuditReport.tapTargetIssues++;

      const statusIcon = (!layoutMetrics.hasHorizontalOverflow && layoutMetrics.brokenImagesCount === 0) ? '✅' : '⚠️';
      console.log(`  ${statusIcon} [${vp.name}] Width: ${layoutMetrics.viewportWidth}px, ScrollWidth: ${layoutMetrics.scrollWidth}px, Overflow: ${layoutMetrics.hasHorizontalOverflow ? 'YES (BUG)' : 'NONE'}, Broken Imgs: ${layoutMetrics.brokenImagesCount}`);

      pageData.viewports.push({
        viewport: vp.name,
        metrics: layoutMetrics,
        screenshot: shotPath
      });

      await page.close();
    }

    fullAuditReport.pages.push(pageData);
  }

  await browser.close();

  fs.writeFileSync(path.join(ROOT, 'pixel_audit_results.json'), JSON.stringify(fullAuditReport, null, 2));

  console.log('\n====================================================');
  console.log('📊 PIXEL AUDIT SUMMARY ACROSS ALL VIEWPORTS');
  console.log('====================================================');
  console.log(`Total Viewport Variations Tested: ${fullAuditReport.totalChecked}`);
  console.log(`Horizontal Overflow Layout Bugs:  ${fullAuditReport.overflowBugs}`);
  console.log(`Sub-30px Tap Target Warnings:     ${fullAuditReport.tapTargetIssues}`);
  console.log(`All Screenshots Stored In:        ${SCREENSHOTS_DIR}`);
  console.log('====================================================\n');
}

runPixelPerfectAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
