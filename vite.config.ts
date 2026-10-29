import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import type { PluginOption } from 'vite'

function pwaPlugin(): PluginOption {
  return VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    devOptions: {
      enabled: false
    },
    injectManifest: {
      // Statyczne mini-aplikacje i raporty z public/ oraz biblioteka PDF (tylko skan do PDF) nie należą do powłoki:
      // pobieramy je przy pierwszym użyciu (patrz runtime cache w sw.ts), a nie przy instalacji.
      globIgnores: ['audit.html', 'raport_*.html', 'assets/es-*.js'],
    },
    includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon.png', 'icons.svg'],
    manifest: {
      name: 'Sparky',
      short_name: 'Sparky',
      description: 'Elite performance, discipline and identity tracking system',
      // Must match .dark --background in src/index.css — manifest.json/build config
      // can't read CSS custom properties, so this is kept in sync by hand.
      theme_color: '#030712',
      background_color: '#030712',
      start_url: '/',
      display: 'standalone',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: 'Dodaj notatkę',
          short_name: 'Notatka',
          description: 'Utwórz nową notatkę w Keep',
          url: '/keep?new=1',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
        },
        {
          name: 'Dodaj zadanie',
          short_name: 'Zadanie',
          description: 'Dodaj nowe zadanie do listy To Do',
          url: '/?todo=new',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
        },
        {
          name: 'Dodaj posiłek',
          short_name: 'Posiłek',
          description: 'Zaloguj posiłek',
          url: '/?meal=new',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
        },
        {
          name: 'Rozpocznij trening',
          short_name: 'Trening',
          description: 'Otwórz logger treningu',
          url: '/trening',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
        }
      ],
      share_target: {
        action: '/',
        method: 'GET',
        enctype: 'application/x-www-form-urlencoded',
        params: {
          title: 'share_title',
          text: 'share_text',
          url: 'share_url'
        }
      }
    }
  })
}

// https://vite.dev/config/
// mode=capacitor → relative base, no service worker (APK shell). Default mode → Vercel PWA.
export default defineConfig(({ mode }) => {
  const forCapacitor = mode === 'capacitor'

  return {
    base: forCapacitor ? './' : '/',
    resolve: {
      alias: {
        '@vanguard/domain': path.resolve(__dirname, './packages/domain/src/index.ts')
      }
    },
    plugins: [
      react(),
      ...(forCapacitor ? [] : [pwaPlugin()]),
    ],
    // Scan only the real app entry. By default Vite crawls every *.html in the repo
    // (android/ builds, .superpowers/ previews, coverage/), which made cold start ~40 s.
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      watch: {
        ignored: ['**/android/**', '**/coverage/**', '**/dist/**', '**/.superpowers/**', '**/.worktrees/**', '**/.tmp/**', '**/*.log'],
      },
      proxy: {
        '/oura-api': {
          target: 'https://api.ouraring.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/oura-api/, ''),
          secure: false
        },
      },
    },
    build: {
      sourcemap: !forCapacitor
    }
  }
})
