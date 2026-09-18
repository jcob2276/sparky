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
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await supabase.auth.admin.getUserById(env.VANGUARD_USER_ID);
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://localhost:5173/keep' },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(linkData.properties.action_link);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click new note
  const newNoteBtn = page.locator('button:has(svg.lucide-square-pen), button:has(svg.lucide-pen-line), button:has(svg.lucide-plus)').first();
  await newNoteBtn.click();
  await page.waitForTimeout(1000);

  const editorInfo = await page.evaluate(() => {
    const editor = document.querySelector('.keep-rich-editor');
    const placeholder = document.querySelector('.keep-rich-editor + span');
    const editorContainer = editor?.parentElement;
    const inlineEditor = document.querySelector('.keep-inline-editor');

    const getBox = (el) => el ? el.getBoundingClientRect() : null;
    const getStyle = (el) => el ? {
      color: window.getComputedStyle(el).color,
      backgroundColor: window.getComputedStyle(el).backgroundColor,
      fontSize: window.getComputedStyle(el).fontSize,
      opacity: window.getComputedStyle(el).opacity,
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility,
      height: window.getComputedStyle(el).height,
      minHeight: window.getComputedStyle(el).minHeight,
    } : null;

    return {
      editorBox: getBox(editor),
      editorStyle: getStyle(editor),
      containerBox: getBox(editorContainer),
      containerStyle: getStyle(editorContainer),
      inlineEditorBox: getBox(inlineEditor),
      inlineEditorStyle: getStyle(inlineEditor),
      html: editorContainer?.outerHTML?.slice(0, 500),
    };
  });

  console.log('Editor Info:', JSON.stringify(editorInfo, null, 2));
  await browser.close();
}

run().catch(console.error);
