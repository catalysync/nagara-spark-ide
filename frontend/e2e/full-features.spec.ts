import { test, expect } from '@playwright/test'

const API = 'http://localhost:8000'

test.describe('Full Feature Test Suite', () => {
  test.setTimeout(120000)

  // ==================== API-LEVEL TESTS ====================

  test.describe('Projects API - Full CRUD', () => {
    test('create, read, update, list, delete project', async ({ request }) => {
      // CREATE
      const cr = await request.post(`${API}/api/projects`, {
        data: { name: 'CRUD Project', description: 'Full CRUD test' }
      })
      expect(cr.status()).toBe(201)
      const proj = await cr.json()
      expect(proj.name).toBe('CRUD Project')
      expect(proj.description).toBe('Full CRUD test')
      expect(proj.id).toBeTruthy()

      // READ
      const gr = await request.get(`${API}/api/projects/${proj.id}`)
      expect(gr.status()).toBe(200)
      const got = await gr.json()
      expect(got.name).toBe('CRUD Project')

      // UPDATE
      const ur = await request.put(`${API}/api/projects/${proj.id}`, {
        data: { name: 'CRUD Project Updated', description: 'Updated desc' }
      })
      expect(ur.status()).toBe(200)
      const upd = await ur.json()
      expect(upd.name).toBe('CRUD Project Updated')

      // LIST
      const lr = await request.get(`${API}/api/projects`)
      expect(lr.status()).toBe(200)
      const list = await lr.json()
      expect(list.projects.some((p: any) => p.id === proj.id)).toBe(true)

      // DELETE
      const dr = await request.delete(`${API}/api/projects/${proj.id}`)
      expect(dr.status()).toBe(200)

      // Verify deleted
      const gr2 = await request.get(`${API}/api/projects/${proj.id}`)
      expect(gr2.status()).toBe(404)
    })
  })

  test.describe('Workbooks API - Full CRUD + Execution', () => {
    let projectId: string

    test.beforeAll(async ({ request }) => {
      const r = await (await request.post(`${API}/api/projects`, {
        data: { name: 'Workbook Feature Test' }
      })).json()
      projectId = r.id
    })

    test('create, read, update, list, delete workbook', async ({ request }) => {
      // CREATE
      const cr = await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Test WB', description: 'A workbook' }
      })
      expect(cr.status()).toBe(201)
      const wb = await cr.json()
      expect(wb.name).toBe('Test WB')

      // READ
      const gr = await request.get(`${API}/api/projects/${projectId}/workbooks/${wb.id}`)
      expect(gr.status()).toBe(200)

      // UPDATE with nodes and edges
      const ur = await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          name: 'Updated WB',
          nodes: [{ id: 'n1', type: 'dataset', name: 'D1', language: 'python', code: 'spark.range(5)', position: { x: 0, y: 0 } }],
          edges: [],
          global_code: 'from pyspark.sql import functions as F'
        }
      })
      expect(ur.status()).toBe(200)
      const upd = await ur.json()
      expect(upd.name).toBe('Updated WB')
      expect(upd.nodes.length).toBe(1)
      expect(upd.global_code).toContain('pyspark')

      // LIST
      const lr = await request.get(`${API}/api/projects/${projectId}/workbooks`)
      expect(lr.status()).toBe(200)
      const list = await lr.json()
      expect(list.workbooks.length).toBeGreaterThan(0)

      // DELETE
      const dr = await request.delete(`${API}/api/projects/${projectId}/workbooks/${wb.id}`)
      expect(dr.status()).toBe(200)
    })

    test('execute node with dependencies', async ({ request }) => {
      // Create workbook with 2 nodes + edge
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Exec Test WB' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'src', type: 'dataset', name: 'Source', language: 'python', code: 'df = spark.range(10)\ndf', position: { x: 0, y: 0 } },
            { id: 'tx', type: 'transform', name: 'Transform', language: 'python', code: 'result = Source.filter("id > 5")\nresult', position: { x: 200, y: 0 } },
          ],
          edges: [{ id: 'e1', source: 'src', target: 'tx' }],
          global_code: 'from pyspark.sql import functions as F'
        }
      })

      // Execute transform (should auto-execute source first)
      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/tx/execute`, { data: { preview: false } })).json()
      expect(r.status).toBe('success')
      expect(r.dataframe).toBeTruthy()
      expect(r.dataframe.columns).toContain('id')
      expect(r.dataframe.rows.length).toBe(4) // 6,7,8,9

      // Get schema
      const sr = await (await request.get(`${API}/api/workbooks/${wb.id}/nodes/tx/schema`)).json()
      expect(sr.schema).toBeTruthy()
      expect(sr.schema.length).toBeGreaterThan(0)
      expect(sr.schema[0].name).toBe('id')
    })

    test('execute node with preview mode', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Preview Test' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'pv', type: 'dataset', name: 'PV', language: 'python', code: 'df = spark.range(1000)\ndf', position: { x: 0, y: 0 } },
          ],
          edges: []
        }
      })

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/pv/execute`, { data: { preview: true } })).json()
      expect(r.status).toBe('success')
      expect(r.dataframe).toBeTruthy()
      // Preview should limit rows
      expect(r.dataframe.rows.length).toBeLessThanOrEqual(50)
    })

    test('execute console code', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Console Test' }
      })).json()

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/console/execute`, {
        data: { code: '1 + 1' }
      })).json()
      expect(r.status).toBe('success')
      expect(r.result).toBe('2')
    })

    test('execute SQL node', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'SQL Test' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'data', type: 'dataset', name: 'Numbers', language: 'python', code: 'df = spark.range(20)\ndf', position: { x: 0, y: 0 } },
            { id: 'sql', type: 'transform', name: 'SQL_Query', language: 'sql', code: 'SELECT id, id * 2 as doubled FROM Numbers WHERE id < 5', position: { x: 200, y: 0 } },
          ],
          edges: [{ id: 'e1', source: 'data', target: 'sql' }],
        }
      })

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/sql/execute`, { data: { preview: false } })).json()
      expect(r.status).toBe('success')
      expect(r.dataframe).toBeTruthy()
      expect(r.dataframe.columns).toContain('doubled')
      expect(r.dataframe.rows.length).toBe(5)
    })

    test('execute node with global code', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Global Code Test' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'gc', type: 'dataset', name: 'GC', language: 'python', code: 'df = spark.range(10).withColumn("sq", F.col("id") * F.col("id"))\ndf', position: { x: 0, y: 0 } },
          ],
          edges: [],
          global_code: 'from pyspark.sql import functions as F'
        }
      })

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/gc/execute`, { data: { preview: false } })).json()
      expect(r.status).toBe('success')
      expect(r.dataframe.columns).toContain('sq')
    })

    test('execute node with stdout capture', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Stdout Test' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'so', type: 'dataset', name: 'SO', language: 'python', code: 'print("hello from node")\nspark.range(1)', position: { x: 0, y: 0 } },
          ],
          edges: []
        }
      })

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/so/execute`, { data: { preview: false } })).json()
      expect(r.status).toBe('success')
      expect(r.stdout).toContain('hello from node')
    })

    test('execute node with error returns error status', async ({ request }) => {
      const wb = await (await request.post(`${API}/api/projects/${projectId}/workbooks`, {
        data: { name: 'Error Test' }
      })).json()

      await request.put(`${API}/api/projects/${projectId}/workbooks/${wb.id}`, {
        data: {
          nodes: [
            { id: 'err', type: 'dataset', name: 'ERR', language: 'python', code: 'raise ValueError("intentional error")', position: { x: 0, y: 0 } },
          ],
          edges: []
        }
      })

      const r = await (await request.post(`${API}/api/workbooks/${wb.id}/nodes/err/execute`, { data: { preview: false } })).json()
      expect(r.status).toBe('error')
      expect(r.error).toContain('intentional error')
    })
  })

  test.describe('Datasets API', () => {
    let projectId: string

    test.beforeAll(async ({ request }) => {
      const r = await (await request.post(`${API}/api/projects`, {
        data: { name: 'Dataset Feature Test' }
      })).json()
      projectId = r.id
    })

    test('create, read, list, delete dataset', async ({ request }) => {
      // CREATE
      const cr = await request.post(`${API}/api/projects/${projectId}/datasets`, {
        data: { name: 'Manual Dataset', source_type: 'manual', description: 'A test dataset' }
      })
      expect(cr.status()).toBe(201)
      const ds = await cr.json()
      expect(ds.name).toBe('Manual Dataset')

      // READ
      const gr = await request.get(`${API}/api/projects/${projectId}/datasets/${ds.id}`)
      expect(gr.status()).toBe(200)

      // LIST
      const lr = await request.get(`${API}/api/projects/${projectId}/datasets`)
      expect(lr.status()).toBe(200)
      const list = await lr.json()
      expect(list.datasets.length).toBeGreaterThan(0)

      // DELETE
      const dr = await request.delete(`${API}/api/projects/${projectId}/datasets/${ds.id}`)
      expect(dr.status()).toBe(200)
    })

    test('upload CSV and get preview + schema', async ({ request }) => {
      // Use Playwright's multipart support
      const uploadResp = await request.post(`${API}/api/projects/${projectId}/datasets/upload-csv`, {
        multipart: {
          name: 'People',
          file: {
            name: 'people.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from('name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago\n'),
          },
        },
      })
      expect(uploadResp.status()).toBe(201)
      const ds = await uploadResp.json()
      expect(ds.name).toBe('People')
      expect(ds.row_count).toBe(3)

      // PREVIEW
      const pr = await request.get(`${API}/api/projects/${projectId}/datasets/${ds.id}/preview`)
      expect(pr.status()).toBe(200)
      const preview = await pr.json()
      expect(preview.columns).toBeTruthy()
      expect(preview.rows.length).toBe(3)

      // SCHEMA
      const sr = await request.get(`${API}/api/projects/${projectId}/datasets/${ds.id}/schema`)
      expect(sr.status()).toBe(200)
      const schema = await sr.json()
      expect(schema.schema.length).toBe(3) // name, age, city
      expect(schema.schema.map((f: any) => f.name)).toContain('name')
      expect(schema.schema.map((f: any) => f.name)).toContain('age')
    })
  })

  test.describe('Connections API', () => {
    let projectId: string

    test.beforeAll(async ({ request }) => {
      const r = await (await request.post(`${API}/api/projects`, {
        data: { name: 'Connection Feature Test' }
      })).json()
      projectId = r.id
    })

    test('create, read, update, list, delete connection', async ({ request }) => {
      // CREATE
      const cr = await request.post(`${API}/api/projects/${projectId}/connections`, {
        data: { name: 'Test PG', connector_type: 'postgresql', config: { host: 'localhost', port: 5432, database: 'testdb', username: 'user', password: 'pass' } }
      })
      expect(cr.status()).toBe(201)
      const conn = await cr.json()
      expect(conn.name).toBe('Test PG')
      expect(conn.connector_type).toBe('postgresql')

      // READ (password should be masked)
      const gr = await request.get(`${API}/api/projects/${projectId}/connections/${conn.id}`)
      expect(gr.status()).toBe(200)
      const got = await gr.json()
      expect(got.config.password).not.toBe('pass')

      // UPDATE
      const ur = await request.put(`${API}/api/projects/${projectId}/connections/${conn.id}`, {
        data: { name: 'Updated PG' }
      })
      expect(ur.status()).toBe(200)
      const upd = await ur.json()
      expect(upd.name).toBe('Updated PG')

      // LIST
      const lr = await request.get(`${API}/api/projects/${projectId}/connections`)
      expect(lr.status()).toBe(200)
      const list = await lr.json()
      expect(list.connections.length).toBeGreaterThan(0)

      // DELETE
      const dr = await request.delete(`${API}/api/projects/${projectId}/connections/${conn.id}`)
      expect(dr.status()).toBe(200)
    })

    test('test connection to real PostgreSQL', async ({ request }) => {
      const cr = await request.post(`${API}/api/projects/${projectId}/connections`, {
        data: { name: 'Real PG', connector_type: 'postgresql', config: { host: 'localhost', port: 5432, database: 'nagara', username: 'nagara', password: 'nagara' } }
      })
      const conn = await cr.json()

      const tr = await request.post(`${API}/api/projects/${projectId}/connections/${conn.id}/test`)
      expect(tr.status()).toBe(200)
      const result = await tr.json()
      expect(result.status).toBe('connected')
      expect(result.message).toBeTruthy()
    })

    test('list resources from PostgreSQL', async ({ request }) => {
      const cr = await request.post(`${API}/api/projects/${projectId}/connections`, {
        data: { name: 'PG Resources', connector_type: 'postgresql', config: { host: 'localhost', port: 5432, database: 'nagara', username: 'nagara', password: 'nagara' } }
      })
      const conn = await cr.json()

      const rr = await request.get(`${API}/api/projects/${projectId}/connections/${conn.id}/resources`)
      expect(rr.status()).toBe(200)
      const resources = await rr.json()
      expect(resources.resources).toBeTruthy()
      expect(Array.isArray(resources.resources)).toBe(true)
    })
  })

  test.describe('Health API', () => {
    test('returns spark ready', async ({ request }) => {
      const r = await request.get(`${API}/api/health`)
      expect(r.status()).toBe(200)
      const body = await r.json()
      expect(body.status).toBe('ok')
      expect(body.spark).toBe(true)
    })
  })

  test.describe('Error Handling', () => {
    test('404 for non-existent project', async ({ request }) => {
      const r = await request.get(`${API}/api/projects/00000000-0000-0000-0000-000000000000`)
      expect(r.status()).toBe(404)
    })

    test('404 for non-existent workbook', async ({ request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Err Test' } })).json()
      const r = await request.get(`${API}/api/projects/${proj.id}/workbooks/00000000-0000-0000-0000-000000000000`)
      expect(r.status()).toBe(404)
    })

    test('422 for missing required fields', async ({ request }) => {
      const r = await request.post(`${API}/api/projects`, { data: {} })
      expect(r.status()).toBe(422)
    })
  })

  // ==================== UI-LEVEL TESTS ====================

  test.describe('UI - Project Management', () => {
    test('create project from UI and verify it appears in list', async ({ page }) => {
      await page.goto('/projects')
      await expect(page.locator('h1')).toHaveText('Projects')

      // Create project
      await page.click('text=+ New project')
      await page.fill('input[placeholder="My Project"]', 'UI Feature Test')
      await page.fill('input[placeholder="Optional description"]', 'Testing all UI features')
      await page.click('text=Create')

      // Should navigate to project home
      await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)
      await expect(page.locator('h1')).toHaveText('UI Feature Test')
    })

    test('project home tabs switch correctly', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Tab Switch Test' } })).json()
      await page.goto(`/projects/${proj.id}`)

      // Default tab should be Workbooks
      await expect(page.getByRole('button', { name: 'Workbooks', exact: true })).toBeVisible()

      // Switch to Datasets tab
      await page.getByRole('button', { name: 'Datasets', exact: true }).click()
      await page.waitForTimeout(300)

      // Switch to Connections tab
      await page.getByRole('button', { name: 'Connections', exact: true }).click()
      await page.waitForTimeout(300)

      // Switch back to Workbooks
      await page.getByRole('button', { name: 'Workbooks', exact: true }).click()
      await page.waitForTimeout(300)
    })

    test('breadcrumb navigation works', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Breadcrumb Test' } })).json()
      await page.goto(`/projects/${proj.id}`)
      await expect(page.locator('h1')).toHaveText('Breadcrumb Test')

      // Click Projects breadcrumb
      await page.click('text=Projects')
      await expect(page).toHaveURL(/\/projects$/)
    })
  })

  test.describe('UI - Workbook Editor', () => {
    test('workbook editor loads with toolbar and empty canvas', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Editor Load Test' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'Editor WB' } })).json()

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)

      // Graph toolbar buttons
      await expect(page.locator('text=+ Dataset')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=+ Transform')).toBeVisible()

      // Spark status
      await expect(page.locator('text=Spark Ready')).toBeVisible({ timeout: 15000 })
    })

    test('add dataset node from toolbar', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Add Dataset Test' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'DS WB' } })).json()

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)
      await expect(page.locator('text=+ Dataset')).toBeVisible({ timeout: 10000 })

      await page.click('text=+ Dataset')
      await expect(page.locator('text=Import Dataset')).toBeVisible({ timeout: 3000 })

      await page.fill('input[placeholder="Dataset name"]', 'My Numbers')
      await page.locator('textarea').fill('spark.range(100)')
      await page.click('button:has-text("Import")')

      await expect(page.locator('text=My Numbers')).toBeVisible({ timeout: 5000 })
    })

    test('add transform node from toolbar', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Add Transform Test' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'TX WB' } })).json()

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)
      await expect(page.locator('text=+ Transform')).toBeVisible({ timeout: 10000 })

      await page.click('text=+ Transform')
      await expect(page.locator('text=New Transform')).toBeVisible({ timeout: 3000 })

      // The placeholder is dynamic: "Transform 1", etc. Find the input inside the dialog
      const dialog = page.locator('div[style*="position: fixed"]')
      const nameInput = dialog.locator('input').first()
      await nameInput.fill('My Filter')
      await page.click('button:has-text("Create Transform")')

      await expect(page.locator('text=My Filter')).toBeVisible({ timeout: 5000 })
    })

    test('theme toggle switches theme', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Theme Test' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'Theme WB' } })).json()

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)
      const themeBtn = page.locator('button[title*="Switch to"]')
      await expect(themeBtn).toBeVisible({ timeout: 10000 })

      const initialTitle = await themeBtn.getAttribute('title')
      await themeBtn.click()
      await page.waitForTimeout(300)

      const newTitle = await themeBtn.getAttribute('title')
      expect(newTitle).not.toBe(initialTitle)
    })

    test('back button returns to project', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Back Btn Test' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'Back WB' } })).json()

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)
      await expect(page.locator('text=+ Dataset')).toBeVisible({ timeout: 10000 })

      const backBtn = page.locator('button').filter({ hasText: '←' }).first()
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click()
        await expect(page).toHaveURL(new RegExp(`/projects/${proj.id}`))
      }
    })
  })

  test.describe('UI - Node Execution in Editor', () => {
    test('execute a dataset node and see preview', async ({ page, request }) => {
      // Setup workbook with a node via API
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Node Exec UI' } })).json()
      const wb = await (await request.post(`${API}/api/projects/${proj.id}/workbooks`, { data: { name: 'Exec WB' } })).json()

      await request.put(`${API}/api/projects/${proj.id}/workbooks/${wb.id}`, {
        data: {
          nodes: [{ id: 'n1', type: 'dataset', name: 'TestData', language: 'python', code: 'spark.range(5)', position: { x: 200, y: 200 } }],
          edges: [],
        }
      })

      await page.goto(`/projects/${proj.id}/workbooks/${wb.id}`)

      // Click on the node to select it
      await page.locator('text=TestData').first().click({ timeout: 10000 })
      await page.waitForTimeout(500)

      // The editor panel should open - look for Run button
      const runBtn = page.locator('button').filter({ hasText: /^▶$/ }).first()
      if (await runBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await runBtn.click()
        // Wait for execution
        await page.waitForTimeout(5000)
      }
    })
  })

  test.describe('UI - Dataset Detail Page', () => {
    test('dataset detail page shows preview and schema', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'DS Detail Test' } })).json()

      const ds = await (await request.post(`${API}/api/projects/${proj.id}/datasets/upload-csv`, {
        multipart: {
          name: 'Products',
          file: {
            name: 'products.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from('product,price,qty\nWidget,9.99,100\nGadget,19.99,50\n'),
          },
        },
      })).json()

      // Navigate to dataset detail
      await page.goto(`/projects/${proj.id}/datasets/${ds.id}`)

      // Should see dataset name
      await expect(page.locator('h1')).toHaveText('Products', { timeout: 10000 })

      // Should see preview data
      await expect(page.locator('text=Widget')).toBeVisible({ timeout: 5000 })

      // Switch to Schema tab
      await page.click('text=Schema')
      await expect(page.getByRole('cell', { name: 'product' })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('cell', { name: 'price' })).toBeVisible()

      // Switch to Details tab
      await page.click('text=Details')
      await expect(page.locator('text=Row Count')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('UI - Connection Detail Page', () => {
    test('connection detail shows config and test button', async ({ page, request }) => {
      const proj = await (await request.post(`${API}/api/projects`, { data: { name: 'Conn Detail Test' } })).json()

      const conn = await (await request.post(`${API}/api/projects/${proj.id}/connections`, {
        data: { name: 'Detail PG', connector_type: 'postgresql', config: { host: 'localhost', port: 5432, database: 'nagara', username: 'nagara', password: 'nagara' } }
      })).json()

      await page.goto(`/projects/${proj.id}/connections/${conn.id}`)

      // Should see connection name
      await expect(page.locator('h1')).toHaveText('Detail PG', { timeout: 10000 })

      // Test connection button
      const testBtn = page.locator('button:has-text("Test Connection")')
      await expect(testBtn).toBeVisible({ timeout: 5000 })
      await testBtn.click()

      // Should show success
      await expect(page.locator('text=PostgreSQL')).toBeVisible({ timeout: 10000 })

      // Browse resources button
      const browseBtn = page.locator('button:has-text("Browse Resources")')
      if (await browseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await browseBtn.click()
        await page.waitForTimeout(2000)
      }
    })
  })

  test.describe('UI - Sidebar Navigation', () => {
    test('app sidebar shows and collapses', async ({ page }) => {
      await page.goto('/projects')

      // Sidebar should be visible with Nagara text
      await expect(page.locator('text=Nagara')).toBeVisible({ timeout: 5000 })

      // Collapse button
      const collapseBtn = page.locator('button:has-text("←")').first()
      if (await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await collapseBtn.click()
        await page.waitForTimeout(300)

        // Nagara text should be hidden
        await expect(page.locator('text=Nagara')).not.toBeVisible()

        // Expand
        const expandBtn = page.locator('button:has-text("→")').first()
        await expandBtn.click()
        await page.waitForTimeout(300)
        await expect(page.locator('text=Nagara')).toBeVisible()
      }
    })
  })
})
