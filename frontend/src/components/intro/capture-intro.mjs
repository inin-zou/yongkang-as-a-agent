// From frontend/: node src/components/intro/capture-intro.mjs
// Requires the Vite server and permission to launch Chromium.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const output = '/tmp/journey-intro-screenshots'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1512, height: 805 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://localhost:5173/lab/intro')
  await page.locator('.intro-stage[data-time]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.querySelector('.intro-canvas').style.opacity === '1')
  const report = []
  const capture = async (fraction, prefix = '') => {
    await page.evaluate(progress => {
      const root = document.querySelector('.intro-root')
      const start = root.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, start + window.innerHeight * 11 * progress)
    }, fraction)
    await page.waitForFunction(expected => Math.abs(Number(document.querySelector('.intro-stage').dataset.time) - expected) < 0.02, fraction * 22)
    const state = await page.evaluate(() => {
      const stage = document.querySelector('.intro-stage')
      return {
        scrollY: window.scrollY, time: Number(stage.dataset.time), top: stage.getBoundingClientRect().top,
        range: document.querySelector('.pin-spacer').getBoundingClientRect().height - stage.getBoundingClientRect().height,
        viewport: window.innerHeight, shot: document.querySelector('.intro-hud-shot').textContent,
        canvas: document.querySelector('.intro-canvas').style.opacity,
      }
    })
    const boundaries = [0, 3, 6, 9, 12.5, 15.4, 18.4, 21.4]
    const labels = ['01 出发', '02 观看', '03 试探', '04 跨越', '05 抵达', '06 转向', '07 继续', '08 当下']
    const index = boundaries.reduce((last, start, i) => state.time >= start ? i : last, 0)
    assert.equal(state.shot, labels[index], 'Wrong shot label for scroll position')
    const layout = await page.evaluate(() => {
      const hud = document.querySelector('.intro-hud')
      const button = hud.querySelector('button')
      const rect = button.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      const stage = document.querySelector('.intro-stage').getBoundingClientRect()
      const art = document.querySelector('.intro-art').getBoundingClientRect()
      return {
        hudAccessible: button === hit || button.contains(hit),
        bottom: stage.bottom,
        viewport: window.innerHeight,
        bodyColor: getComputedStyle(document.body).backgroundColor,
        covers: art.left <= stage.left + 1 && art.top <= stage.top + 1 && art.right >= stage.right - 1 && art.bottom >= stage.bottom - 1,
        sameSurface: Math.abs(art.width / art.height - 16 / 9) < 0.001,
      }
    })
    assert.ok(layout.hudAccessible, 'Scene occludes the HUD')
    assert.ok(layout.covers, 'Art leaves a letterbox strip')
    assert.ok(layout.sameSurface, 'Canvas/SVG source-column mapping changed')
    assert.ok(layout.bottom >= layout.viewport - 1, 'Stage leaves an exposed bottom band')
    assert.equal(layout.bodyColor, 'rgb(242, 239, 231)', 'Dark page surround')
    assert.ok(Math.abs(state.top) < 2, `Stage offset: ${JSON.stringify(state)}`)
    assert.ok(Math.abs(state.range - state.viewport * 11) < 2, 'Wrong scroll range')
    const path = `${output}/${prefix}${String(Math.round(fraction * 220)).padStart(3, '0')}.png`
    await page.screenshot({ path })
    report.push({ fraction, path, ...state })
  }
  // Check actual browser SVG matrices, complementing the GSAP/jsdom samples.
  const hips = []
  for (let sample = 0; sample <= 60; sample++) {
    const time = sample / 20
    await page.evaluate(t => window.scrollTo(0, window.innerHeight * 11 * t / 22), time)
    await page.waitForFunction(t => Math.abs(Number(document.querySelector('.intro-stage').dataset.time) - t) < 0.02, time)
    const pair = await page.evaluate(() => {
      const svg = document.querySelector('.intro-shot01')
      const scene = svg.getScreenCTM().inverse()
      return ['.intro-body01', '.intro-leg01'].map(selector => {
        const point = new DOMPoint(688, 324).matrixTransform(document.querySelector(selector).getScreenCTM()).matrixTransform(scene)
        return [point.x, point.y]
      })
    })
    assert.ok(Math.hypot(pair[0][0] - pair[1][0], pair[0][1] - pair[1][1]) <= 2, `Hip separates at ${time}`)
    hips.push({ time, body: pair[0], leg: pair[1] })
  }
  await writeFile(`${output}/hips.json`, JSON.stringify(hips, null, 2))
  for (const fraction of [0, 0.05, 0.12, 0.20, 0.25, 0.36, 0.45, 0.5, 0.6, 0.71, 0.735, 0.8, 0.85, 0.91, 0.96, 1]) await capture(fraction)
  for (const fraction of [0.96, 0.85, 0.8, 0.735, 0.71, 0.6, 0.45, 0.36, 0.20, 0.05, 0]) await capture(fraction, 'reverse-')
  await page.getByRole('button', { name: 'mode: scroll' }).click()
  await page.waitForFunction(() => Number(document.querySelector('.intro-stage').dataset.time) > 0.1)
  await page.getByRole('button', { name: 'mode: play' }).click()
  await capture(0.5, 'resumed-')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400) // ScrollTrigger's resize debounce.
  for (const fraction of [0.05, 0.20, 0.36, 0.5, 0.6, 0.8, 0.96, 1]) await capture(fraction, 'mobile-')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.intro-static').waitFor()
  assert.equal(await page.locator('.intro-static figure').count(), 7)
  assert.equal(await page.locator('canvas, .pin-spacer').count(), 0)
  await page.screenshot({ path: `${output}/reduced-motion-mobile.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: `${output}/reduced-motion.png`, fullPage: true })
  assert.deepEqual(errors, [])
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2))
  console.log(`Verified scroll, pin, playback, mobile and reduced motion. Screenshots: ${output}`)
} finally {
  await browser.close()
}
