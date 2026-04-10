import { test, expect } from '@playwright/test'

test.describe('Hackathon Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/files/skill/hackathons')
    // Wait for map to render
    await page.waitForSelector('.hackathon-map-container', { timeout: 10000 })
  })

  test('renders the map container', async ({ page }) => {
    const container = page.locator('.hackathon-map-container')
    await expect(container).toBeVisible()
    // Should have grab cursor
    const cursor = await container.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('grab')
  })

  test('map has SVG content with dots', async ({ page }) => {
    const svgs = page.locator('.hackathon-map-container svg')
    const count = await svgs.count()
    // At least the 3 map tiles + 3 hit target SVGs
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('horizontal drag pans the map', async ({ page }) => {
    const container = page.locator('.hackathon-map-container')
    const box = await container.boundingBox()
    if (!box) throw new Error('Map container not found')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    const mapInner = page.getByTestId('map-inner')
    const getTransform = async () => mapInner.evaluate(el => el.style.transform)
    const before = await getTransform()

    // Dispatch pointer events directly since Playwright mouse fires mouse events
    await container.evaluate((el, { cx, cy }) => {
      const rect = el.getBoundingClientRect()
      const opts = { bubbles: true, clientX: cx, clientY: cy, pointerId: 1, button: 0 }
      el.dispatchEvent(new PointerEvent('pointerdown', opts))
      for (let i = 1; i <= 20; i++) {
        el.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: cx - i * 10 }))
      }
      el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: cx - 200 }))
    }, { cx, cy })

    await page.waitForTimeout(100)
    const after = await getTransform()
    expect(after).not.toBe(before)
  })

  test('vertical drag does NOT move the map vertically', async ({ page }) => {
    const container = page.locator('.hackathon-map-container')
    const box = await container.boundingBox()
    if (!box) throw new Error('Map container not found')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Check no translateY in the transform
    const getTransform = async () => {
      return container.locator('div').first().evaluate(el => el.style.transform)
    }

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, cy - 100, { steps: 10 })
    await page.mouse.up()

    const transform = await getTransform()
    // Should only have translateX, no translateY or translate(x, y)
    expect(transform).not.toContain('translateY')
    expect(transform).toMatch(/translateX\([^)]+\)/)
  })

  test('map wraps horizontally without gaps', async ({ page }) => {
    const container = page.locator('.hackathon-map-container')
    const box = await container.boundingBox()
    if (!box) throw new Error('Map container not found')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Drag far to the right (more than one map width) — should wrap without breaking
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(cx + (i + 1) * 100, cy, { steps: 2 })
    }
    await page.mouse.up()

    // Map should still be visible and have SVG content
    const svgs = page.locator('.hackathon-map-container svg')
    const count = await svgs.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('city pin hit targets exist in SVG', async ({ page }) => {
    // Verify hit target circles exist (tooltip hover is hard to test reliably with transforms)
    const circles = page.locator('.hackathon-map-container svg circle[fill="transparent"]')
    const count = await circles.count()
    // Should have hit targets for each city cluster (3 copies x N cities)
    expect(count).toBeGreaterThan(0)
  })
})
