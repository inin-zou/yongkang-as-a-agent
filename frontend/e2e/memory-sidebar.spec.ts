import { test, expect } from '@playwright/test'

test.describe('Memory sidebar', () => {
  test('should show 3 category buttons + guestbook in sidebar', async ({ page }) => {
    await page.goto('/files/memory')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    await expect(sidebar.locator('text=HACKATHON JOURNEY')).toBeVisible()
    await expect(sidebar.locator('text=TECHNICAL BLOG')).toBeVisible()
    await expect(sidebar.locator('text=RESEARCH READING')).toBeVisible()
    await expect(sidebar.locator('text=GUESTBOOK')).toBeVisible()
  })

  test('category buttons should be clickable and navigate', async ({ page }) => {
    await page.goto('/files/memory')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('.sidebar')

    // Click technical category
    await sidebar.locator('text=TECHNICAL BLOG').click()
    await page.waitForTimeout(500)

    // URL should change
    expect(page.url()).toContain('/files/memory/technical')

    // Sidebar should show back button
    const backBtn = sidebar.locator('.sidebar-back')
    await expect(backBtn).toBeVisible()

    // Click back
    await backBtn.click()
    await page.waitForTimeout(500)

    // Categories should be visible again
    await expect(sidebar.locator('text=HACKATHON JOURNEY')).toBeVisible()
  })

  test('slider animation works correctly', async ({ page }) => {
    await page.goto('/files/memory')
    await page.waitForLoadState('networkidle')

    // Check initial slider position
    const slider = page.locator('.sidebar-slider')
    const transform1 = await slider.evaluate(el => window.getComputedStyle(el).transform)
    console.log('Initial transform:', transform1)
    expect(transform1).toBe('matrix(1, 0, 0, 1, 0, 0)') // translateX(0)

    // Click a category
    await page.locator('.sidebar-category-btn:has-text("TECHNICAL")').click()
    await page.waitForTimeout(500) // wait for animation

    // Slider should have moved
    const transform2 = await slider.evaluate(el => window.getComputedStyle(el).transform)
    console.log('After click transform:', transform2)
    // translateX(-100%) on a ~279px wide container = matrix(1, 0, 0, 1, -279, 0)
    expect(transform2).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
  })

  test('check sidebar debug info', async ({ page }) => {
    await page.goto('/files/memory')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const debug = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar')
      if (!sidebar) return { error: 'no sidebar' }

      const sliderContainer = sidebar.querySelector('.sidebar-slider-container')
      const slider = sidebar.querySelector('.sidebar-slider')
      const noteItems = sidebar.querySelectorAll('.note-item')

      return {
        sidebarSize: { w: sidebar.offsetWidth, h: sidebar.offsetHeight },
        sidebarOverflow: window.getComputedStyle(sidebar).overflow,
        hasSliderContainer: !!sliderContainer,
        containerSize: sliderContainer ? { w: sliderContainer.offsetWidth, h: sliderContainer.offsetHeight } : null,
        containerDisplay: sliderContainer ? window.getComputedStyle(sliderContainer).display : null,
        containerFlex: sliderContainer ? window.getComputedStyle(sliderContainer).flex : null,
        containerPosition: sliderContainer ? window.getComputedStyle(sliderContainer).position : null,
        hasSlider: !!slider,
        sliderSize: slider ? { w: slider.offsetWidth, h: slider.offsetHeight } : null,
        sliderPosition: slider ? window.getComputedStyle(slider).position : null,
        noteItemCount: noteItems.length,
        noteItemTexts: Array.from(noteItems).map(n => n.textContent?.substring(0, 40)),
        noteItemVisibility: Array.from(noteItems).map(n => ({
          text: n.textContent?.substring(0, 20),
          visible: n.offsetWidth > 0 && n.offsetHeight > 0,
          box: n.getBoundingClientRect(),
        })),
      }
    })

    console.log('=== PRODUCTION SIDEBAR DEBUG ===')
    console.log(JSON.stringify(debug, null, 2))

    expect(debug.noteItemCount).toBeGreaterThanOrEqual(3)
  })
})
