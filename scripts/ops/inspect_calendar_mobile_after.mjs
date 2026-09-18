import fs from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

async function run() {
  if (!fs.existsSync('screeny')) {
    fs.mkdirSync('screeny', { recursive: true });
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await supabase.auth.admin.getUserById(env.VANGUARD_USER_ID);
  console.log('User email:', user.email);

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://localhost:5173/dashboard' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });
  // iPhone 14 / 15 dimensions
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to magic link...');
  await page.goto(linkData.properties.action_link);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Navigating to /badania/laboratorium...');
  await page.goto('http://localhost:5173/badania/laboratorium');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'screeny/laboratorium_truth.png', fullPage: true });
  console.log('Saved screeny/laboratorium_truth.png');

  // 1. Capture Day view (tab index 0)
  const tabs = page.locator('button[data-ui="tab"]');
  if (await tabs.count() >= 3) {
    await tabs.nth(0).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screeny/mobile_day_after.png', fullPage: false });
    console.log('Saved screeny/mobile_day_after.png');

    // 2. Capture 3D view (tab index 1)
    await tabs.nth(1).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screeny/mobile_3day_after.png', fullPage: false });
    console.log('Saved screeny/mobile_3day_after.png');

    // 3. Capture Week view (tab index 2)
    await tabs.nth(2).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screeny/mobile_week_after.png', fullPage: false });
    console.log('Saved screeny/mobile_week_after.png');
  }

  // 4. Capture Quick Create modal
  const fab = page.locator('button[aria-label*="Dodaj"], .calendar-fab, button:has(svg.lucide-plus)').last();
  if (await fab.count() > 0) {
    await fab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screeny/mobile_modal_after.png', fullPage: false });
    console.log('Saved screeny/mobile_modal_after.png');
  }

  await browser.close();
  console.log('Mobile inspection after fixes complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
