import fs from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

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
    options: { redirectTo: 'http://localhost:5173/' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await mobileContext.newPage();
  console.log('Navigating to magic link...');
  await page.goto(linkData.properties.action_link);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // If a modal opened (e.g. DOMKNIĘCIE DNIA), close it first
  try {
    const xIcon = page.locator('svg.lucide-x').first();
    if (await xIcon.isVisible({ timeout: 2000 })) {
      console.log('Closing overlay modal via lucide-x...');
      await xIcon.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('No modal overlay found or already closed.');
  }

  // 1. Dziś Tab (without overlay)
  await page.screenshot({ path: 'screeny/dash_dzis.png', fullPage: true });
  console.log('Saved screeny/dash_dzis.png');

  // Check if nav exists
  const hasNav = await page.$('nav[aria-label="Główna nawigacja"]');
  if (hasNav) {
    // 2. Tydzień Tab
    console.log('Clicking Tydzień...');
    await page.click('nav[aria-label="Główna nawigacja"] button:has-text("Tydzień")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screeny/dash_tydzien.png', fullPage: true });
    console.log('Saved screeny/dash_tydzien.png');

    // 3. Kronika Tab
    console.log('Clicking Kronika...');
    await page.click('nav[aria-label="Główna nawigacja"] button:has-text("Kronika")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screeny/dash_historia.png', fullPage: true });
    console.log('Saved screeny/dash_historia.png');
  } else {
    console.log('Dashboard is in Morning Lockdown / Orientation screen (showLock=true)');
  }

  await browser.close();
  console.log('Done capturing dashboard screens.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
