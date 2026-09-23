Render `og-card.html` with Playwright Chromium at a 1200×630 viewport and `deviceScaleFactor: 1`.
Open its absolute `file://` URL with `page.goto()`; allow Google Fonts to load, then `await page.evaluate(() => document.fonts.ready)`.
From the repository root, save with `await page.screenshot({ path: 'frontend/public/og-image.png', fullPage: false })`.
The HTML embeds its styles and walking mark; only Google Fonts requires network access.
