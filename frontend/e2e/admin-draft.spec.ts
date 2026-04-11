import { test, expect } from '@playwright/test'

test.describe('Admin draft creator layout', () => {
  test('check button layout on new post form', async ({ page }) => {
    await page.goto('/files/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Debug: check what's on the page
    const debug = await page.evaluate(() => {
      // Find the "NEW POST" button or the draft form
      const allBtns = Array.from(document.querySelectorAll('button'))
      const newPostBtn = allBtns.find(b => b.textContent?.includes('NEW POST'))

      return {
        allButtonTexts: allBtns.map(b => b.textContent?.trim().substring(0, 30)),
        hasNewPost: !!newPostBtn,
        pageContent: document.querySelector('.editor-content')?.innerHTML?.substring(0, 500) ?? 'no editor-content',
      }
    })
    console.log('=== PAGE STATE ===')
    console.log(JSON.stringify(debug, null, 2))

    // Click NEW POST if it exists
    const newPostBtn = page.locator('button:has-text("NEW POST")')
    if (await newPostBtn.count() > 0) {
      await newPostBtn.click()
      await page.waitForTimeout(1000)
    }

    // Now check the draft form layout
    const formDebug = await page.evaluate(() => {
      // Find GENERATE WITH AI, SKIP AI, CANCEL buttons
      const allBtns = Array.from(document.querySelectorAll('button'))
      const genBtn = allBtns.find(b => b.textContent?.includes('GENERATE'))
      const skipBtn = allBtns.find(b => b.textContent?.includes('SKIP'))
      const cancelBtn = allBtns.find(b => b.textContent?.trim() === 'CANCEL')

      const getBtnInfo = (btn: Element | undefined) => {
        if (!btn) return null
        const rect = btn.getBoundingClientRect()
        const styles = window.getComputedStyle(btn)
        return {
          text: btn.textContent?.trim(),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          fontSize: styles.fontSize,
          display: styles.display,
          parentDisplay: btn.parentElement ? window.getComputedStyle(btn.parentElement).display : null,
          parentFlexDir: btn.parentElement ? window.getComputedStyle(btn.parentElement).flexDirection : null,
          parentFlexWrap: btn.parentElement ? window.getComputedStyle(btn.parentElement).flexWrap : null,
          parentGap: btn.parentElement ? window.getComputedStyle(btn.parentElement).gap : null,
          parentClass: btn.parentElement?.className,
          parentWidth: btn.parentElement?.offsetWidth,
        }
      }

      return {
        generate: getBtnInfo(genBtn),
        skip: getBtnInfo(skipBtn),
        cancel: getBtnInfo(cancelBtn),
        // Check if they're on the same Y position (same line)
        sameLineGenSkip: genBtn && skipBtn ? Math.abs(genBtn.getBoundingClientRect().y - skipBtn.getBoundingClientRect().y) < 5 : null,
        sameLineSkipCancel: skipBtn && cancelBtn ? Math.abs(skipBtn.getBoundingClientRect().y - cancelBtn.getBoundingClientRect().y) < 5 : null,
      }
    })

    console.log('=== BUTTON LAYOUT ===')
    console.log(JSON.stringify(formDebug, null, 2))

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-draft-layout.png', fullPage: false })
  })
})
