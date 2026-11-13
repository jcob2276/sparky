import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android shell for Vanguard.
 * PWA on Vercel is unchanged — this config only affects `npm run mobile:*` builds.
 * Web dir must match Vite `outDir` (default: dist).
 */
const config: CapacitorConfig = {
  appId: 'app.vanguard.os',
  appName: 'Sparky',
  webDir: 'dist',
  server: {
    // Prefer HTTPS assets from the bundled dist; no live reload in production APK.
    androidScheme: 'https',
    // iOS shell (sideloaded, re-signed every 7 days): `CAP_SERVER_URL=https://... npx cap sync ios` makes the app load the
    // deployed site, so it is always the newest version without rebuilding the native shell. Unset = bundled dist.
    ...(process.env.CAP_SERVER_URL ? { url: process.env.CAP_SERVER_URL, cleartext: false } : {}),
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      // Brand background; keep in sync with Android ic_launcher_background.
      backgroundColor: '#171918',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1C1917',
      overlaysWebView: true,
    },
  },
};

export default config;
