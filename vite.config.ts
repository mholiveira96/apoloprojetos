import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const apiRoutes: Record<string, string> = {
  '/api/auth/login': 'api/auth/login.js',
  '/api/auth/logout': 'api/auth/logout.js',
  '/api/auth/session': 'api/auth/session.js',
  '/api/app/bootstrap': 'api/app/bootstrap.js',
  '/api/app/mutate': 'api/app/mutate.js',
  '/api/app/proposal': 'api/app/proposal.js',
  '/api/public/premissas': 'api/public/premissas.js',
}

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) {
          next()
          return
        }

        const requestUrl = new URL(req.url, 'http://127.0.0.1')
        const routeFile = apiRoutes[requestUrl.pathname]
        if (!routeFile) {
          next()
          return
        }

        try {
          const filePath = path.resolve(projectRoot, routeFile)
          const stats = await fs.stat(filePath)
          const moduleUrl = `${pathToFileURL(filePath).href}?t=${stats.mtimeMs}`
          const mod = await import(moduleUrl)
          const handler = mod.default

          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid API handler' }))
            return
          }

          await handler(req, res)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'API request failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.png', 'logo-apolo.png', 'logo-apolo-darkmode.png'],
        manifest: {
          name: 'Apolo Projetos Inteligentes',
          short_name: 'Apolo',
          description: 'Gestão de projetos de engenharia — CRM, operações e financeiro',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          scope: '/',
          start_url: '/app',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/assets/Modelo Portfolio*'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1h
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
