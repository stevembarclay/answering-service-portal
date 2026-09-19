/**
 * REST API tests — /api/v1/*
 *
 * Runs as the `api-tests` project using the operator auth state.
 * The test:
 *  1. Navigates to the operator clients list to extract a real business_id from the URL
 *  2. Creates an operator API key via the UI and captures the raw key from the <code> element
 *  3. Uses page.request to exercise the API endpoints with the captured key
 *  4. Cleans up (revokes) the created key at the end
 */
import { test, expect } from '@playwright/test'
import { OperatorClientsPage } from './pages/OperatorClientsPage'

let apiKey = ''
let businessId = ''
const keyLabel = `e2e-api-${Date.now()}`

test.describe.configure({ mode: 'serial' })

test.describe('REST API — setup', () => {
  test('extract business_id from first client detail URL', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.goto()
    await page.waitForLoadState('networkidle')
    await clients.clickFirstClient()
    // URL is /operator/clients/<uuid>
    const url = page.url()
    const match = url.match(/\/operator\/clients\/([a-f0-9-]{36})/)
    expect(match, 'Could not extract UUID from client detail URL').not.toBeNull()
    businessId = match![1]
  })

  test('create operator API key and capture raw key', async ({ page }) => {
    await page.goto('/operator/api-webhooks')
    await page.waitForLoadState('networkidle')

    // Fill the key label
    const labelInput = page.getByPlaceholder('Key label')
    await labelInput.fill(keyLabel)

    // Create
    await page.getByRole('button', { name: 'Create key' }).click()

    // The raw key is displayed in a <code> element
    const codeEl = page.locator('code')
    await expect(codeEl).toBeVisible({ timeout: 10_000 })
    const rawKey = await codeEl.textContent()
    expect(rawKey, 'Raw key was empty').toBeTruthy()
    apiKey = rawKey!.trim()

    // Dismiss
    await page.getByRole('button', { name: "I've saved it" }).click()

    // Confirm key is in the active key list
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(keyLabel)).toBeVisible()
  })
})

test.describe('REST API — /api/v1/calls', () => {
  test('GET /api/v1/calls returns paginated results', async ({ page }) => {
    const res = await page.request.get(`/api/v1/calls?business_id=${businessId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Should have a data array (may be empty for fresh demo)
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('GET /api/v1/calls with no auth returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/v1/calls?business_id=${businessId}`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/calls with wrong business_id returns 403 or empty', async ({ page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await page.request.get(`/api/v1/calls?business_id=${fakeId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    // Either 403 (forbidden) or 200 with empty data (RLS returns nothing)
    expect([200, 403, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.data).toHaveLength(0)
    }
  })

  test('POST /api/v1/calls ingests a call with calls:write scope (returns 201)', async ({ page }) => {
    // 'calls:write' is now offered in the operator key creation UI and included by default.
    // Keys created via the API & Webhooks page therefore carry calls:write.
    const res = await page.request.post('/api/v1/calls', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: [
        {
          businessId,
          timestamp: new Date().toISOString(),
          callerName: 'E2E Test Caller',
          callerNumber: '555-0199',
          callType: 'general-info',
          direction: 'inbound',
          durationSeconds: 45,
          telephonyStatus: 'completed',
          message: 'Automated E2E test call — please ignore',
        },
      ],
    })
    // 201 = all rows inserted; 207 = partial success (some validation errors)
    expect([201, 207]).toContain(res.status())
  })

  test('POST /api/v1/calls with no auth returns 400 or 401', async ({ page }) => {
    const res = await page.request.post('/api/v1/calls', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        businessId,
        timestamp: new Date().toISOString(),
        callerName: 'E2E Bad Call',
        callerNumber: '555-0000',
        direction: 'inbound',
        message: 'test',
      },
    })
    // Route may validate body before auth (400) or auth before body (401) — both are acceptable rejections
    expect([400, 401]).toContain(res.status())
  })
})

test.describe('REST API — /api/v1/on-call', () => {
  test('GET /api/v1/on-call/current responds to valid auth', async ({ page }) => {
    const res = await page.request.get(`/api/v1/on-call/current?business_id=${businessId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    // 200 with data, 404 if no active shift, 403 if key lacks on_call:read scope
    // (on_call:read is excluded from default key scope selection in the UI)
    expect([200, 404, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body).toBeDefined()
    }
  })
})

test.describe('REST API — OpenAPI spec', () => {
  test('GET /api/v1/openapi.json returns valid JSON with info.title', async ({ page }) => {
    const res = await page.request.get('/api/v1/openapi.json')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('info')
    expect(body.info).toHaveProperty('title')
    expect(typeof body.info.title).toBe('string')
    expect(body.info.title.length).toBeGreaterThan(0)
  })
})

test.describe('REST API — cleanup', () => {
  test('revoke the test API key', async ({ page }) => {
    await page.goto('/operator/api-webhooks')
    await page.waitForLoadState('networkidle')

    // Find the key label and revoke
    const keyRow = page.getByText(keyLabel)
    if (await keyRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const revokeBtn = keyRow
        .locator('..')
        .locator('..')
        .getByRole('button', { name: 'Revoke' })
      await revokeBtn.click()
      await expect(page.getByText(keyLabel)).not.toBeVisible({ timeout: 5_000 })
    }
  })
})
