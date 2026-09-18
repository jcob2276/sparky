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
    options: { redirectTo: 'http://localhost:5173/oura' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Mobile View (iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  console.log('Mobile: Navigating to magic link...');
  await mobilePage.goto(linkData.properties.action_link);
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);
  await mobilePage.goto('http://localhost:5173/oura');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: 'screeny/oura_mobile_sleep.png', fullPage: true });
  console.log('Saved screeny/oura_mobile_sleep.png');

  // 2. Garmin Tab
  await mobilePage.click('button:has-text("Garmin")');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: 'screeny/oura_mobile_garmin.png', fullPage: true });
  console.log('Saved screeny/oura_mobile_garmin.png');

  // 3. Fueling Tab
  await mobilePage.click('button:has-text("Paliwo")');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: 'screeny/oura_mobile_fueling.png', fullPage: true });
  console.log('Saved screeny/oura_mobile_fueling.png');

  // 4. Vitals Tab
  await mobilePage.click('button:has-text("Witalność")');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: 'screeny/oura_mobile_vitals.png', fullPage: true });
  console.log('Saved screeny/oura_mobile_vitals.png');

  await browser.close();
  console.log('Inspection complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
