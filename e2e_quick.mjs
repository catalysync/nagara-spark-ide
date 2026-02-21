import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Opening...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('text=Spark Ready', { timeout: 15000 });
  console.log('Spark Ready!');

  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_fixed.png', fullPage: true });
  console.log('Screenshot taken');

  // Try force-clicking the Dataset button
  const btn = await page.$('button[title="Import Dataset"]');
  if (btn) {
    console.log('Found Dataset button, force clicking...');
    await btn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_dialog.png', fullPage: true });
    console.log('Dialog screenshot taken');
  } else {
    console.log('Dataset button not found');
  }

  await browser.close();
  console.log('Done');
}

test().catch(e => { console.error('Failed:', e.message); process.exit(1); });
