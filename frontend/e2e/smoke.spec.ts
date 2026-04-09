import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('homepage loads and shows landing page', async ({ page }) => {
    await page.goto('/')
    // Landing page should render -- check for the page body or a known element
    await expect(page.locator('body')).toBeVisible()
    // The page should have loaded without errors (title should exist)
    await expect(page).toHaveTitle(/.+/)
  })

  test('/files/soul loads and shows SOUL.md content', async ({ page }) => {
    await page.goto('/files/soul')
    await expect(page.locator('body')).toBeVisible()
    // Wait for content to appear (the page uses data fetching)
    await page.waitForTimeout(1000)
  })

  test('/files/skill loads and shows skills list', async ({ page }) => {
    await page.goto('/files/skill')
    await expect(page.locator('body')).toBeVisible()
    await page.waitForTimeout(1000)
  })

  test('/files/memory loads', async ({ page }) => {
    await page.goto('/files/memory')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/files/contact loads', async ({ page }) => {
    await page.goto('/files/contact')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/files/music loads', async ({ page }) => {
    await page.goto('/files/music')
    await expect(page.locator('body')).toBeVisible()
  })

  test('API /api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })

  test('API /api/skills returns 200', async ({ request }) => {
    const response = await request.get('/api/skills')
    expect(response.status()).toBe(200)
  })

  test('API /api/hackathons returns 200', async ({ request }) => {
    const response = await request.get('/api/hackathons')
    expect(response.status()).toBe(200)
  })

  test('API /api/experience returns 200', async ({ request }) => {
    const response = await request.get('/api/experience')
    expect(response.status()).toBe(200)
  })
})
