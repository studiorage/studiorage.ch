import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const previews = [
  {
    url: 'https://schaefer-and-companions.art/',
    output: 'images/website-previews/schaefer-and-companions.webp'
  },
  {
    url: 'https://hardingwatch.com/',
    output: 'images/website-previews/harding-watch.webp'
  }
];

await fs.mkdir('images/website-previews', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1
});

for (const preview of previews) {
  try {
    await page.goto(preview.url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.screenshot({
      path: preview.output,
      type: 'webp',
      quality: 86,
      fullPage: false
    });
    console.log(`Updated ${preview.output}`);
  } catch (error) {
    console.error(`Could not update ${preview.url}:`, error.message);
    process.exitCode = 1;
  }
}

await browser.close();
