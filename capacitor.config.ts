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
