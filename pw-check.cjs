const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Login
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(800);
  await page.getByPlaceholder('admin').fill('admin');
  await page.locator('input[type="password"]').fill('password');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);

  // Navigate to cities
  await page.goto('http://localhost:5173/cities');
  await page.waitForTimeout(5000); // wait for cards/maps to load

  // Screenshot before typing
  await page.screenshot({ path: 'D:\\dev\\locationSocket\\pw-cities-before.png', fullPage: false });

  // Type in the combobox to open dropdown
  await page.locator('input[placeholder="Filtrar por nome…"]').click();
  await page.locator('input[placeholder="Filtrar por nome…"]').fill('São');
  await page.waitForTimeout(600);

  // Screenshot with dropdown open
  await page.screenshot({ path: 'D:\\dev\\locationSocket\\pw-cities-dropdown.png', fullPage: false });

  // Get z-index info
  const zInfo = await page.evaluate(() => {
    const dropdown = document.querySelector('.combobox-dropdown');
    const filterBar = document.querySelector('.filter-bar');
    const firstCard = document.querySelector('.fa-card');
    const leafletPane = document.querySelector('.leaflet-map-pane');

    function getZ(el) {
      if (!el) return 'not found';
      const s = window.getComputedStyle(el);
      return `z-index:${s.zIndex} position:${s.position}`;
    }

    return {
      dropdown: getZ(dropdown),
      dropdownRect: dropdown?.getBoundingClientRect(),
      filterBar: getZ(filterBar),
      firstCard: getZ(firstCard),
      leafletPane: getZ(leafletPane),
      leafletTilePane: getZ(document.querySelector('.leaflet-tile-pane')),
      leafletObjectLayer: getZ(document.querySelector('.leaflet-objects-pane')),
    };
  });

  console.log('=== Z-INDEX INFO ===');
  console.log(JSON.stringify(zInfo, null, 2));

  console.log('\n=== PAGE ERRORS ===');
  errors.length === 0 ? console.log('None') : errors.forEach(e => console.log(e));

  console.log('\nScreenshots saved.');
  await browser.close();
})();
