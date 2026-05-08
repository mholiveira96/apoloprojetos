import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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
    plugins: [react(), tailwindcss(), localApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
