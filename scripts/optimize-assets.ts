import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function optimizeAssets() {
  console.log('⚡ Optimizing image assets for ultra-fast mobile delivery...');

  const logoPath = path.resolve('public/logo.png');
  const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Generate ultra-crisp 128x128 navbar/sidebar logo (logo-sm.png)
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:transparent;overflow:hidden;">
        <img id="img-sm" src="${logoBase64}" style="width:128px;height:128px;display:block;image-rendering:auto;" />
      </body>
    </html>
  `);
  const imgSm = page.locator('#img-sm');
  await imgSm.screenshot({ path: path.resolve('public/logo-sm.png'), omitBackground: true });

  // 2. Generate optimized 512x512 logo.png
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:transparent;overflow:hidden;">
        <img id="img-512" src="${logoBase64}" style="width:512px;height:512px;display:block;image-rendering:auto;" />
      </body>
    </html>
  `);
  const img512 = page.locator('#img-512');
  await img512.screenshot({ path: path.resolve('public/logo.png'), omitBackground: true });

  await browser.close();

  const statOriginal = fs.statSync(path.resolve('public/logo.png'));
  const statSm = fs.statSync(path.resolve('public/logo-sm.png'));

  console.log(`✅ public/logo-sm.png created: ${(statSm.size / 1024).toFixed(1)} KB (down from 441 KB!)`);
  console.log(`✅ public/logo.png optimized (512x512): ${(statOriginal.size / 1024).toFixed(1)} KB`);
}

optimizeAssets().catch((err) => {
  console.error('❌ Asset optimization failed:', err);
  process.exit(1);
});
