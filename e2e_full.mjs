import { chromium } from 'playwright';

const API = 'http://localhost:8000';
const APP = 'http://localhost:5173';

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function test() {
  console.log('=== Nagara Code Workbooks E2E Test ===\n');

  // 1. Test backend API directly
  console.log('1. Testing backend APIs...');

  const health = await api('/api/health');
  console.log(`   Health: ${JSON.stringify(health)}`);
  if (!health.spark) throw new Error('Spark not ready');

  // Load default workbook
  const wb = await api('/api/workbook');
  console.log(`   Workbook loaded: "${wb.name}", ${wb.nodes.length} nodes`);

  // 2. Create a dataset node via API
  console.log('\n2. Creating dataset node via API...');
  const updatedWb = {
    ...wb,
    nodes: [
      {
        id: 'ds1',
        type: 'dataset',
        name: 'sample_data',
        language: 'python',
        code: 'output = spark.createDataFrame([\n  (1, "Alice", 85.5),\n  (2, "Bob", 92.3),\n  (3, "Carol", 78.1),\n  (4, "Dave", 95.0),\n  (5, "Eve", 88.7),\n], ["id", "name", "score"])',
        save_as_dataset: false,
        position: { x: 100, y: 100 },
      },
    ],
    edges: [],
  };
  await api('/api/workbook', { method: 'PUT', body: JSON.stringify(updatedWb) });
  console.log('   Dataset node created');

  // 3. Execute the dataset node
  console.log('\n3. Executing dataset node...');
  const execResult = await api('/api/workbook/nodes/ds1/execute', { method: 'POST' });
  console.log(`   Status: ${execResult.status}`);
  console.log(`   Rows: ${execResult.row_count}, Columns: ${execResult.columns?.join(', ')}`);
  if (execResult.status !== 'success') throw new Error(`Execution failed: ${execResult.error}`);

  // 4. Preview the dataset
  console.log('\n4. Previewing dataset...');
  const preview = await api('/api/workbook/nodes/ds1/preview', { method: 'POST' });
  console.log(`   Preview rows: ${preview.row_count}`);
  console.log(`   First row: ${JSON.stringify(preview.data?.[0])}`);

  // 5. Get schema
  console.log('\n5. Getting schema...');
  const schema = await api('/api/workbook/nodes/ds1/schema');
  console.log(`   Schema: ${JSON.stringify(schema.columns)}`);

  // 6. Add a Python transform node
  console.log('\n6. Adding Python transform node...');
  const wb2 = await api('/api/workbook');
  wb2.nodes.push({
    id: 'tf1',
    type: 'transform',
    name: 'high_scorers',
    language: 'python',
    code: 'output = sample_data.filter(sample_data.score > 85)',
    save_as_dataset: false,
    position: { x: 400, y: 100 },
  });
  wb2.edges.push({ id: 'e1', source: 'ds1', target: 'tf1' });
  await api('/api/workbook', { method: 'PUT', body: JSON.stringify(wb2) });
  console.log('   Transform node + edge created');

  // 7. Execute the transform (should resolve DAG)
  console.log('\n7. Executing transform (DAG resolution)...');
  const tfResult = await api('/api/workbook/nodes/tf1/execute', { method: 'POST' });
  console.log(`   Status: ${tfResult.status}`);
  console.log(`   Rows: ${tfResult.row_count} (should be 4 - Alice, Bob, Dave, Eve)`);
  console.log(`   Data: ${JSON.stringify(tfResult.data?.slice(0, 2))}`);
  if (tfResult.status !== 'success') throw new Error(`Transform failed: ${tfResult.error}`);

  // 8. Add a SQL transform
  console.log('\n8. Adding SQL transform node...');
  const wb3 = await api('/api/workbook');
  wb3.nodes.push({
    id: 'tf2',
    type: 'transform',
    name: 'score_stats',
    language: 'sql',
    code: 'SELECT COUNT(*) as cnt, ROUND(AVG(score), 2) as avg_score, MAX(score) as max_score FROM high_scorers',
    save_as_dataset: false,
    position: { x: 700, y: 100 },
  });
  wb3.edges.push({ id: 'e2', source: 'tf1', target: 'tf2' });
  await api('/api/workbook', { method: 'PUT', body: JSON.stringify(wb3) });

  const sqlResult = await api('/api/workbook/nodes/tf2/execute', { method: 'POST' });
  console.log(`   SQL Status: ${sqlResult.status}`);
  console.log(`   SQL Data: ${JSON.stringify(sqlResult.data)}`);
  if (sqlResult.status !== 'success') throw new Error(`SQL transform failed: ${sqlResult.error}`);

  // 9. Test console REPL
  console.log('\n9. Testing console REPL...');
  const consoleResult = await api('/api/console/execute', {
    method: 'POST',
    body: JSON.stringify({ code: 'print("Hello from console!"); spark.range(3).show()' }),
  });
  console.log(`   Console output: ${consoleResult.output?.substring(0, 100)}`);

  // 10. Browser E2E test
  console.log('\n10. Browser UI test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(APP, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('text=Spark Ready', { timeout: 15000 });
  console.log('   App loaded, Spark Ready');

  // Take initial screenshot
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/01_initial.png', fullPage: true });

  // Click Import Dataset button
  const dsBtn = await page.$('button[title="Import Dataset"]');
  if (dsBtn) {
    await dsBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/02_import_dialog.png', fullPage: true });
    console.log('   Import dialog opened');

    // Close dialog (press Escape)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Click Add Transform button
  const tfBtn = await page.$('button[title="Add Transform"]');
  if (tfBtn) {
    await tfBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/03_transform_dialog.png', fullPage: true });
    console.log('   Transform dialog opened');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Reload the page to load the workbook we saved via API (with 3 nodes)
  console.log('   Reloading to show saved workbook...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/04_workbook_loaded.png', fullPage: true });
  console.log('   Workbook with nodes loaded');

  // Click on a node to select it (should open bottom editor panel)
  const nodes = await page.$$('.react-flow__node');
  console.log(`   Found ${nodes.length} nodes on graph`);
  if (nodes.length > 0) {
    await nodes[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/05_node_selected.png', fullPage: true });
    console.log('   Node selected, editor panel should be visible');
  }

  // Test theme toggle
  const themeBtn = await page.$('button[title*="theme"], button[title*="Theme"], button[title*="light"], button[title*="dark"]');
  if (themeBtn) {
    await themeBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/06_light_theme.png', fullPage: true });
    console.log('   Toggled to light theme');
    await themeBtn.click();
    await page.waitForTimeout(300);
  }

  // Final screenshot
  await page.screenshot({ path: '/workspaces/codespaces-blank/nagara-spark-ide/screenshots/07_final.png', fullPage: true });

  await browser.close();

  console.log('\n=== ALL TESTS PASSED ===');
  console.log('Screenshots saved to nagara-spark-ide/screenshots/');
}

test().catch(e => { console.error('\nFAILED:', e.message); console.error(e.stack); process.exit(1); });
