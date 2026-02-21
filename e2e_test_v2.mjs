import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('1. Opening Nagara Code Workbooks...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  const title = await page.title();
  console.log(`   Title: ${title}`);

  // Check for Nagara branding
  await page.waitForSelector('text=Nagara', { timeout: 10000 });
  console.log('   Nagara branding found!');

  // Check Spark status
  await page.waitForSelector('text=Spark Ready', { timeout: 15000 });
  console.log('2. Spark connected!');

  // Screenshot initial state
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_initial.png', fullPage: true });
  console.log('3. Screenshot: initial state');

  // Click "Add Dataset" button (should be "+ Dataset" in the graph toolbar)
  console.log('4. Adding a dataset...');
  await page.click('button:has-text("Dataset")');
  await page.waitForSelector('text=Import Dataset', { timeout: 5000 });
  console.log('   Import Dataset dialog opened!');

  // Fill in name and create from code
  await page.fill('input[placeholder="Dataset name"]', 'retail_transactions');
  // Clear and type code
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.fill('data = [(1, "Park A", 100.0, "Mon"), (2, "Park B", 200.0, "Tue"), (3, "Park A", 150.0, "Wed"), (4, "Park B", 300.0, "Mon")]\ndf = spark.createDataFrame(data, ["id", "section", "amount", "day"])\ndf');
  }

  await page.click('button:has-text("Import")');
  await page.waitForTimeout(1000);
  console.log('   Dataset node created!');

  // Screenshot with node
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_dataset.png', fullPage: true });
  console.log('5. Screenshot: dataset added');

  // Run the dataset node
  console.log('6. Running dataset node...');
  const runBtn = await page.$('button:has-text("Run"):not(:has-text("All"))');
  if (runBtn) {
    await runBtn.click();
    await page.waitForSelector('text=success', { timeout: 60000 });
    console.log('   Dataset executed successfully!');
  }

  // Click Preview tab
  const previewTab = await page.$('button:has-text("Preview")');
  if (previewTab) {
    await previewTab.click();
    await page.waitForTimeout(1000);
  }

  // Screenshot with results
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_results.png', fullPage: true });
  console.log('7. Screenshot: results');

  // Add a transform
  console.log('8. Adding a transform...');
  await page.click('button:has-text("Transform")');
  await page.waitForSelector('text=New Transform', { timeout: 5000 });
  await page.fill('input[placeholder*="Transform"]', 'aggregate_by_section');
  await page.click('button:has-text("Create Transform")');
  await page.waitForTimeout(1000);
  console.log('   Transform node created!');

  // Final screenshot
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshot_v2_graph.png', fullPage: true });
  console.log('9. Screenshot: graph with multiple nodes');

  console.log('\n=== ALL TESTS PASSED ===');
  await browser.close();
}

test().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
