import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Opening Nagara Spark IDE...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  // Check title
  const title = await page.title();
  console.log(`   Title: ${title}`);

  // Check Spark status indicator
  console.log('2. Checking Spark connection...');
  await page.waitForSelector('text=Spark Ready', { timeout: 15000 });
  console.log('   Spark is connected!');

  // Screenshot the IDE
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_initial.png', fullPage: true });
  console.log('3. Took initial screenshot');

  // Click the Run Cell button
  console.log('4. Running the default code cell...');
  await page.click('button:has-text("Run Cell")');

  // Wait for results to appear
  await page.waitForSelector('text=Success', { timeout: 60000 });
  console.log('   Code executed successfully!');

  // Wait for DataFrame table to render
  await page.waitForSelector('table', { timeout: 10000 });
  console.log('   DataFrame table rendered!');

  // Check if we can see the data
  const cellText = await page.textContent('table');
  console.log(`   Table contains: ${cellText.substring(0, 100)}...`);

  // Screenshot results
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_results.png', fullPage: true });
  console.log('5. Took results screenshot');

  console.log('\n=== ALL TESTS PASSED ===');

  await browser.close();
}

test().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
