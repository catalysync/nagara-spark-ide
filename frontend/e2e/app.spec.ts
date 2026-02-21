import { test, expect } from '@playwright/test'

test.describe('Nagara Spark IDE E2E', () => {
  test('homepage redirects to /projects', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/projects/)
  })

  test('project list page loads', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('h1')).toHaveText('Projects')
  })

  test('create a new project', async ({ page }) => {
    await page.goto('/projects')
    await page.click('text=+ New project')
    await page.fill('input[placeholder="My Project"]', 'E2E Test Project')
    await page.fill('input[placeholder="Optional description"]', 'Created by Playwright')
    await page.click('text=Create')
    // Should navigate to project home
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)
    await expect(page.locator('h1')).toHaveText('E2E Test Project')
  })

  test('project home shows tabs', async ({ page }) => {
    // First create a project
    await page.goto('/projects')
    await page.click('text=+ New project')
    await page.fill('input[placeholder="My Project"]', 'Tab Test Project')
    await page.click('text=Create')
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)

    // Check tabs exist (use exact role selectors to avoid sidebar matches)
    await expect(page.getByRole('button', { name: 'Workbooks', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Datasets', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Connections', exact: true })).toBeVisible()
  })

  test('create a workbook from project home', async ({ page }) => {
    await page.goto('/projects')
    await page.click('text=+ New project')
    await page.fill('input[placeholder="My Project"]', 'Workbook Test Project')
    await page.click('text=Create')
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)

    await page.click('text=+ New workbook')
    await page.fill('input[placeholder="Workbook name"]', 'My Test Workbook')
    await page.click('button:has-text("Create")')
    // Should navigate to workbook editor
    await expect(page).toHaveURL(/\/workbooks\/[a-f0-9-]+/)
  })

  test('create a connection from project home', async ({ page }) => {
    await page.goto('/projects')
    await page.click('text=+ New project')
    await page.fill('input[placeholder="My Project"]', 'Connection Test Project')
    await page.click('text=Create')
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)

    // Switch to connections tab (use exact match to avoid sidebar)
    await page.getByRole('button', { name: 'Connections', exact: true }).click()
    await page.waitForTimeout(500)
    await page.click('text=+ New connection')

    // Fill connection form
    await page.fill('input[placeholder="My Database"]', 'Test PG')
    await page.fill('input[placeholder="localhost"]', 'localhost')
    await page.fill('input[placeholder="5432"]', '5432')
    // Fill database field
    const dbInput = page.locator('label:has-text("database") + input, label:has-text("database") ~ input').first()
    if (await dbInput.isVisible()) {
      await dbInput.fill('nagara')
    }

    await page.click('button:has-text("Create")')
    // Connection should appear in the table
    await expect(page.locator('td:has-text("Test PG")')).toBeVisible({ timeout: 5000 })
  })

  test('navigate between projects and back', async ({ page }) => {
    await page.goto('/projects')
    // Click on any existing project (from earlier tests)
    const firstRow = page.locator('tbody tr').first()
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click()
      await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)
      // Go back to projects via breadcrumb
      await page.click('text=Projects')
      await expect(page).toHaveURL(/\/projects$/)
    }
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/projects')
    // Sidebar should have home icon
    const sidebar = page.locator('[style*="width: 48px"], [style*="width: 220px"]').first()
    await expect(sidebar).toBeVisible({ timeout: 5000 })
  })

  test('theme toggle in workbook', async ({ page }) => {
    // Create project + workbook to get to workbook view
    await page.goto('/projects')
    await page.click('text=+ New project')
    await page.fill('input[placeholder="My Project"]', 'Theme Test')
    await page.click('text=Create')
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/)
    await page.waitForTimeout(500)
    await page.click('text=+ New workbook')
    await page.fill('input[placeholder="Workbook name"]', 'Theme WB')
    await page.click('button:has-text("Create")')
    await expect(page).toHaveURL(/\/workbooks\//)

    // Theme toggle button should be visible
    const themeBtn = page.locator('button[title*="Switch to"]')
    await expect(themeBtn).toBeVisible({ timeout: 5000 })
  })

  test('health API returns spark ready', async ({ request }) => {
    const resp = await request.get('http://localhost:8000/api/health')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.status).toBe('ok')
    expect(body.spark).toBe(true)
  })

  test('projects CRUD via API', async ({ request }) => {
    // Create
    const createResp = await request.post('http://localhost:8000/api/projects', {
      data: { name: 'API Test', description: 'Playwright API test' }
    })
    expect(createResp.status()).toBe(201)
    const project = await createResp.json()
    expect(project.name).toBe('API Test')

    // Read
    const getResp = await request.get(`http://localhost:8000/api/projects/${project.id}`)
    expect(getResp.status()).toBe(200)

    // Update
    const updateResp = await request.put(`http://localhost:8000/api/projects/${project.id}`, {
      data: { name: 'API Test Updated' }
    })
    expect(updateResp.status()).toBe(200)
    const updated = await updateResp.json()
    expect(updated.name).toBe('API Test Updated')

    // Delete
    const deleteResp = await request.delete(`http://localhost:8000/api/projects/${project.id}`)
    expect(deleteResp.status()).toBe(200)
  })
})
