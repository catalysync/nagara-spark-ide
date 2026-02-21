import { test, expect } from '@playwright/test'

const API = 'http://localhost:8000'
const DATA_DIR = '/workspaces/codespaces-blank/nagara-spark-ide/data'

// Helper: execute a node and return result
async function executeNode(request: any, workbookId: string, nodeId: string) {
  const resp = await request.post(`${API}/api/workbooks/${workbookId}/nodes/${nodeId}/execute`, {
    data: { preview: false }
  })
  return resp.json()
}

test.describe('NYC Taxi Pipeline - Mixed Python & SQL', () => {
  test.setTimeout(300000) // 5 minutes for Spark operations

  test('build and execute a complete taxi pipeline with Python + SQL mix', async ({ request }) => {
    // ===== STEP 1: Create project + workbook =====
    const proj = await (await request.post(`${API}/api/projects`, {
      data: { name: 'NYC Taxi Analysis', description: 'RockTheJVM Spark Capstone - Mixed Python & SQL' }
    })).json()

    const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, {
      data: { name: 'Taxi Data Exploration' }
    })).json()

    const projectId = proj.id
    const workbookId = wb.id
    console.log(`Project: ${projectId}, Workbook: ${workbookId}`)

    // ===== STEP 2: Define all nodes =====

    // --- DATA SOURCES (Python) ---

    const taxiNode = {
      id: 'taxi_data',
      type: 'dataset',
      name: 'Taxi_Trips',
      language: 'python',
      code: `df = spark.read.parquet("${DATA_DIR}/yellow_tripdata_2024-01.parquet")
df`,
      save_as_dataset: false,
      position: { x: 0, y: 300 },
    }

    const zonesNode = {
      id: 'taxi_zones',
      type: 'dataset',
      name: 'Taxi_Zones',
      language: 'python',
      code: `df = spark.read.csv("${DATA_DIR}/taxi_zones.csv", header=True, inferSchema=True)
df`,
      save_as_dataset: false,
      position: { x: 0, y: 500 },
    }

    // --- Q1: Most popular pickup zones (SQL - join + group by) ---
    const q1Node = {
      id: 'q1_popular_zones',
      type: 'transform',
      name: 'Q1_Popular_Zones',
      language: 'sql',
      code: `SELECT z.Zone, z.Borough, COUNT(*) AS total_trips
FROM Taxi_Trips t
JOIN Taxi_Zones z ON t.PULocationID = z.LocationID
GROUP BY z.Zone, z.Borough
ORDER BY total_trips DESC`,
      save_as_dataset: false,
      position: { x: 400, y: 0 },
    }

    // --- Q2: Peak hours for taxi (SQL - extract hour) ---
    const q2Node = {
      id: 'q2_peak_hours',
      type: 'transform',
      name: 'Q2_Peak_Hours',
      language: 'sql',
      code: `SELECT HOUR(tpep_pickup_datetime) AS hour_of_day,
       COUNT(*) AS total_trips
FROM Taxi_Trips
GROUP BY HOUR(tpep_pickup_datetime)
ORDER BY total_trips DESC`,
      save_as_dataset: false,
      position: { x: 400, y: 150 },
    }

    // --- Q3: Trip distance distribution (Python - withColumn + groupBy) ---
    const q3Node = {
      id: 'q3_trip_distribution',
      type: 'transform',
      name: 'Q3_Trip_Distribution',
      language: 'python',
      code: `LONG_THRESHOLD = 30
trips = Taxi_Trips.withColumn("is_long", F.col("trip_distance") >= LONG_THRESHOLD)
result = trips.groupBy("is_long").agg(
    F.count("*").alias("trip_count"),
    F.round(F.avg("trip_distance"), 2).alias("avg_distance"),
    F.round(F.avg("fare_amount"), 2).alias("avg_fare")
).orderBy("is_long")
result`,
      save_as_dataset: false,
      position: { x: 400, y: 300 },
    }

    // --- Q4: Peak hours by trip length (SQL - CASE WHEN) ---
    const q4Node = {
      id: 'q4_peak_by_length',
      type: 'transform',
      name: 'Q4_Peak_By_Length',
      language: 'sql',
      code: `SELECT HOUR(tpep_pickup_datetime) AS hour_of_day,
       CASE WHEN trip_distance >= 30 THEN true ELSE false END AS is_long,
       COUNT(*) AS total_trips
FROM Taxi_Trips
GROUP BY HOUR(tpep_pickup_datetime),
         CASE WHEN trip_distance >= 30 THEN true ELSE false END
ORDER BY total_trips DESC`,
      save_as_dataset: false,
      position: { x: 400, y: 450 },
    }

    // --- Q5: Top zones for long/short trips (Python - complex multi-join) ---
    const q5Node = {
      id: 'q5_top_zones_by_length',
      type: 'transform',
      name: 'Q5_Top_Zones',
      language: 'python',
      code: `LONG_THRESHOLD = 30
trips = Taxi_Trips.withColumn("is_long", F.col("trip_distance") >= LONG_THRESHOLD)
result = trips \\
    .groupBy("PULocationID", "DOLocationID", "is_long") \\
    .agg(F.count("*").alias("total_trips")) \\
    .join(Taxi_Zones, F.col("PULocationID") == F.col("LocationID")) \\
    .withColumnRenamed("Zone", "Pickup_Zone") \\
    .drop("LocationID", "Borough", "service_zone") \\
    .join(Taxi_Zones, F.col("DOLocationID") == F.col("LocationID")) \\
    .withColumnRenamed("Zone", "Dropoff_Zone") \\
    .drop("LocationID", "Borough", "service_zone", "PULocationID", "DOLocationID") \\
    .orderBy(F.col("total_trips").desc())
result`,
      save_as_dataset: false,
      position: { x: 400, y: 600 },
    }

    // --- Q6: Payment type by trip length (SQL - CASE WHEN + GROUP BY) ---
    const q6Node = {
      id: 'q6_payment_by_length',
      type: 'transform',
      name: 'Q6_Payment_Type',
      language: 'sql',
      code: `SELECT CASE WHEN trip_distance >= 30 THEN true ELSE false END AS is_long,
       payment_type,
       COUNT(*) AS total_trips
FROM Taxi_Trips
GROUP BY CASE WHEN trip_distance >= 30 THEN true ELSE false END,
         payment_type
ORDER BY is_long, total_trips DESC`,
      save_as_dataset: false,
      position: { x: 800, y: 0 },
    }

    // --- Q7: Payment evolution over time (Python - date extraction) ---
    const q7Node = {
      id: 'q7_payment_evolution',
      type: 'transform',
      name: 'Q7_Payment_Evolution',
      language: 'python',
      code: `result = Taxi_Trips \\
    .withColumn("pickup_day", F.to_date(F.col("tpep_pickup_datetime"))) \\
    .groupBy("pickup_day", "payment_type") \\
    .agg(
        F.count("*").alias("total_trips"),
        F.round(F.avg("total_amount"), 2).alias("avg_total")
    ) \\
    .orderBy("pickup_day", "payment_type")
result`,
      save_as_dataset: false,
      position: { x: 800, y: 150 },
    }

    // ===== STEP 3: Save workbook with all nodes + edges =====
    const allNodes = [taxiNode, zonesNode, q1Node, q2Node, q3Node, q4Node, q5Node, q6Node, q7Node]
    const allEdges = [
      // Q1 (SQL) depends on taxi data + zones
      { id: 'e1a', source: 'taxi_data', target: 'q1_popular_zones' },
      { id: 'e1b', source: 'taxi_zones', target: 'q1_popular_zones' },
      // Q2 (SQL) depends on taxi data
      { id: 'e2', source: 'taxi_data', target: 'q2_peak_hours' },
      // Q3 (Python) depends on taxi data
      { id: 'e3', source: 'taxi_data', target: 'q3_trip_distribution' },
      // Q4 (SQL) depends on taxi data
      { id: 'e4', source: 'taxi_data', target: 'q4_peak_by_length' },
      // Q5 (Python) depends on taxi data + zones
      { id: 'e5a', source: 'taxi_data', target: 'q5_top_zones_by_length' },
      { id: 'e5b', source: 'taxi_zones', target: 'q5_top_zones_by_length' },
      // Q6 (SQL) depends on taxi data
      { id: 'e6', source: 'taxi_data', target: 'q6_payment_by_length' },
      // Q7 (Python) depends on taxi data
      { id: 'e7', source: 'taxi_data', target: 'q7_payment_evolution' },
    ]

    const saveResp = await request.put(`${API}/api/projects/${projectId}/workbooks/${workbookId}`, {
      data: {
        nodes: allNodes,
        edges: allEdges,
        global_code: 'from pyspark.sql import functions as F, types as T, Window\nimport pandas as pd\n'
      }
    })
    expect(saveResp.status()).toBe(200)
    console.log('Workbook saved: 2 datasets + 4 SQL transforms + 3 Python transforms = 9 nodes, 9 edges')

    // ===== STEP 4: Execute each question and verify =====

    // Q1: Popular zones (SQL)
    console.log('\n--- Q1: Most Popular Pickup Zones (SQL) ---')
    const r1 = await executeNode(request, workbookId, 'q1_popular_zones')
    expect(r1.status).toBe('success')
    expect(r1.dataframe).toBeTruthy()
    expect(r1.dataframe.columns).toContain('Zone')
    expect(r1.dataframe.columns).toContain('Borough')
    expect(r1.dataframe.columns).toContain('total_trips')
    expect(r1.dataframe.rows.length).toBeGreaterThan(0)
    const topZone = r1.dataframe.rows[0]
    console.log(`  Top zone: ${topZone[0]} (${topZone[1]}) with ${topZone[2]} trips`)
    console.log(`  Total zones: ${r1.dataframe.rows.length}`)

    // Q2: Peak hours (SQL)
    console.log('\n--- Q2: Peak Hours for Taxi (SQL) ---')
    const r2 = await executeNode(request, workbookId, 'q2_peak_hours')
    expect(r2.status).toBe('success')
    expect(r2.dataframe).toBeTruthy()
    expect(r2.dataframe.columns).toContain('hour_of_day')
    expect(r2.dataframe.columns).toContain('total_trips')
    expect(r2.dataframe.rows.length).toBe(24)
    const peakHour = r2.dataframe.rows[0]
    console.log(`  Peak hour: ${peakHour[0]}:00 with ${peakHour[1]} trips`)
    console.log(`  Quietest hour: ${r2.dataframe.rows[23][0]}:00 with ${r2.dataframe.rows[23][1]} trips`)

    // Q3: Trip distribution (Python)
    console.log('\n--- Q3: Trip Distance Distribution (Python) ---')
    const r3 = await executeNode(request, workbookId, 'q3_trip_distribution')
    expect(r3.status).toBe('success')
    expect(r3.dataframe).toBeTruthy()
    expect(r3.dataframe.columns).toContain('is_long')
    expect(r3.dataframe.columns).toContain('trip_count')
    expect(r3.dataframe.columns).toContain('avg_distance')
    expect(r3.dataframe.columns).toContain('avg_fare')
    expect(r3.dataframe.rows.length).toBe(2)
    for (const row of r3.dataframe.rows) {
      const label = row[0] ? 'Long (>=30mi)' : 'Short (<30mi)'
      console.log(`  ${label}: ${row[1]} trips, avg distance: ${row[2]}mi, avg fare: $${row[3]}`)
    }

    // Q4: Peak hours by length (SQL)
    console.log('\n--- Q4: Peak Hours by Trip Length (SQL) ---')
    const r4 = await executeNode(request, workbookId, 'q4_peak_by_length')
    expect(r4.status).toBe('success')
    expect(r4.dataframe).toBeTruthy()
    expect(r4.dataframe.columns).toContain('hour_of_day')
    expect(r4.dataframe.columns).toContain('is_long')
    expect(r4.dataframe.columns).toContain('total_trips')
    expect(r4.dataframe.rows.length).toBeGreaterThan(0)
    const topShort = r4.dataframe.rows.find((r: any) => !r[1])
    const topLong = r4.dataframe.rows.find((r: any) => r[1])
    if (topShort) console.log(`  Peak short trip hour: ${topShort[0]}:00 (${topShort[2]} trips)`)
    if (topLong) console.log(`  Peak long trip hour: ${topLong[0]}:00 (${topLong[2]} trips)`)
    console.log(`  Total hour/length combos: ${r4.dataframe.rows.length}`)

    // Q5: Top zones by length (Python)
    console.log('\n--- Q5: Top Pickup/Dropoff Zones by Trip Length (Python) ---')
    const r5 = await executeNode(request, workbookId, 'q5_top_zones_by_length')
    expect(r5.status).toBe('success')
    expect(r5.dataframe).toBeTruthy()
    expect(r5.dataframe.columns).toContain('Pickup_Zone')
    expect(r5.dataframe.columns).toContain('Dropoff_Zone')
    expect(r5.dataframe.columns).toContain('is_long')
    expect(r5.dataframe.rows.length).toBeGreaterThan(0)
    const topRoute = r5.dataframe.rows[0]
    const routeType = topRoute[2] ? 'Long' : 'Short'
    console.log(`  Top ${routeType} route: ${topRoute[3]} -> ${topRoute[4]} (${topRoute[1]} trips)`)
    console.log(`  Total route combos: ${r5.dataframe.rows.length}`)

    // Q6: Payment by length (SQL)
    console.log('\n--- Q6: Payment Type by Trip Length (SQL) ---')
    const r6 = await executeNode(request, workbookId, 'q6_payment_by_length')
    expect(r6.status).toBe('success')
    expect(r6.dataframe).toBeTruthy()
    expect(r6.dataframe.columns).toContain('is_long')
    expect(r6.dataframe.columns).toContain('payment_type')
    expect(r6.dataframe.columns).toContain('total_trips')
    expect(r6.dataframe.rows.length).toBeGreaterThan(0)
    const paymentLabels: Record<number, string> = { 1: 'Credit Card', 2: 'Cash', 3: 'No Charge', 4: 'Dispute', 5: 'Unknown' }
    for (const row of r6.dataframe.rows) {
      const tripType = row[0] ? 'Long' : 'Short'
      const payType = paymentLabels[row[1]] || `Type ${row[1]}`
      console.log(`  ${tripType} - ${payType}: ${row[2]} trips`)
    }

    // Q7: Payment evolution (Python)
    console.log('\n--- Q7: Payment Evolution Over Time (Python) ---')
    const r7 = await executeNode(request, workbookId, 'q7_payment_evolution')
    expect(r7.status).toBe('success')
    expect(r7.dataframe).toBeTruthy()
    expect(r7.dataframe.columns).toContain('pickup_day')
    expect(r7.dataframe.columns).toContain('payment_type')
    expect(r7.dataframe.columns).toContain('total_trips')
    expect(r7.dataframe.columns).toContain('avg_total')
    expect(r7.dataframe.rows.length).toBeGreaterThan(0)
    // Show first and last day
    const firstDay = r7.dataframe.rows[0]
    const lastDay = r7.dataframe.rows[r7.dataframe.rows.length - 1]
    console.log(`  Date range: ${firstDay[0]} to ${lastDay[0]}`)
    console.log(`  Total day-payment combos: ${r7.dataframe.rows.length}`)
    // Show credit card stats for first day
    const creditRows = r7.dataframe.rows.filter((r: any) => r[1] === 1)
    if (creditRows.length > 0) {
      console.log(`  Credit card on ${creditRows[0][0]}: ${creditRows[0][2]} trips, avg $${creditRows[0][3]}`)
    }

    // ===== STEP 5: Verify workbook integrity =====
    const finalWb = await (await request.get(`${API}/api/projects/${projectId}/workbooks/${workbookId}`)).json()
    expect(finalWb.nodes.length).toBe(9)
    expect(finalWb.edges.length).toBe(9)

    // Verify language mix
    const pythonNodes = finalWb.nodes.filter((n: any) => n.language === 'python')
    const sqlNodes = finalWb.nodes.filter((n: any) => n.language === 'sql')
    expect(pythonNodes.length).toBe(5) // 2 datasets + Q3 + Q5 + Q7
    expect(sqlNodes.length).toBe(4) // Q1 + Q2 + Q4 + Q6

    console.log('\n=== ALL 7 TAXI QUESTIONS ANSWERED SUCCESSFULLY ===')
    console.log(`  Pipeline: 2 Python datasets + 4 SQL transforms + 3 Python transforms`)
    console.log(`  Data: ${DATA_DIR}/yellow_tripdata_2024-01.parquet (2.96M+ trips)`)
  })

  test('verify workbook loads in UI', async ({ page, request }) => {
    const projects = await (await request.get(`${API}/api/projects`)).json()
    const taxiProject = projects.projects.find((p: any) => p.name === 'NYC Taxi Analysis')

    if (!taxiProject) {
      test.skip()
      return
    }

    const workbooks = await (await request.get(`${API}/api/projects/${taxiProject.id}/workbooks`)).json()
    const wb = workbooks.workbooks[0]

    await page.goto(`/projects/${taxiProject.id}/workbooks/${wb.id}`)

    // Should see dataset and transform nodes on canvas
    await expect(page.locator('text=Taxi_Trips').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Q1_Popular_Zones').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Q2_Peak_Hours').first()).toBeVisible({ timeout: 5000 })

    // Spark status
    await expect(page.locator('text=Spark Ready')).toBeVisible({ timeout: 15000 })
  })
})
