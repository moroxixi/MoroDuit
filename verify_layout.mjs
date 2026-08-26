import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  const breakpoints = [
    { name: 'mobile', width: 390, height: 1200 },
    { name: 'tablet', width: 768, height: 1200 },
    { name: 'desktop', width: 1280, height: 1200 }
  ];

  for (const bp of breakpoints) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: bp.width, height: bp.height });

    // Collect JS errors
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto(`http://localhost:8765/Customer/Keranjang-Duit/index.html`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for products to load
    try {
      await page.waitForSelector('.produk-card', { timeout: 15000 });
    } catch {
      console.log(`[${bp.name}] No .produk-card found`);
    }

    // Take screenshot
    await page.screenshot({ path: `/tmp/moroduit_${bp.name}.png`, fullPage: true });
    console.log(`[${bp.name}] Screenshot saved`);

    // Card count
    const cardCount = await page.locator('.produk-card').count();
    console.log(`[${bp.name}] Card count: ${cardCount}`);

    if (cardCount > 0) {
      // First card structure
      const firstCard = await page.evaluate(() => {
        const card = document.querySelector('.produk-card');
        const styles = window.getComputedStyle(card);
        return {
          display: styles.display,
          flexDirection: styles.flexDirection,
          className: card.className,
          children: Array.from(card.children).map(c => ({
            tag: c.tagName,
            class: c.className,
            childCount: c.children.length
          }))
        };
      });
      console.log(`[${bp.name}] First card:`, JSON.stringify(firstCard, null, 2));

      // List grid
      const listStyles = await page.evaluate(() => {
        const el = document.querySelector('.produk-list');
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
          gap: styles.gap
        };
      });
      console.log(`[${bp.name}] List grid:`, JSON.stringify(listStyles, null, 2));

      // Check foto dimensions
      const fotoInfo = await page.evaluate(() => {
        const foto = document.querySelector('.produk-foto');
        if (!foto) return null;
        const styles = window.getComputedStyle(foto);
        return {
          width: styles.width,
          height: styles.height,
          objectFit: styles.objectFit
        };
      });
      console.log(`[${bp.name}] Foto:`, JSON.stringify(fotoInfo, null, 2));
    }

    if (jsErrors.length > 0) {
      console.log(`[${bp.name}] JS Errors:`, jsErrors);
    } else {
      console.log(`[${bp.name}] No JS errors`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nAll done!');
})().catch(e => console.error(e));
