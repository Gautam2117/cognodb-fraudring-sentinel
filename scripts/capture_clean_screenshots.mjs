import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, '../public/screenshots');

async function capture() {
  console.log('Launching system Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });

  console.log('Navigating to live app...');
  await page.goto('https://cognodb-fraudring-sentinel.vercel.app/', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait 4 seconds for vis.js canvas physics and nodes to fully settle
  await new Promise((r) => setTimeout(r, 4000));

  console.log('Capturing Main Dashboard screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'dashboard.png'),
    fullPage: false,
  });

  console.log('Navigating to Cypher Console tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Cypher Console'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('Capturing Cypher Playground screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'cypher_playground.png'),
    fullPage: false,
  });

  console.log('Navigating to Graph vs SQL tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Graph vs SQL'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('Capturing Graph vs SQL screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'graph_vs_sql.png'),
    fullPage: false,
  });

  console.log('Screenshots captured successfully!');
  await browser.close();
}

capture().catch((err) => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
