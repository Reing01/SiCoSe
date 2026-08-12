import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'
import { app, BrowserWindow, shell } from 'electron'

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL?.trim()

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function getFrontendDistPath() {
  return path.resolve(app.getAppPath(), 'frontend', 'dist')
}

function getAppIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico')
  }

  return path.resolve(app.getAppPath(), 'electron', 'assets', 'icon.ico')
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

async function readFileIfExists(filePath) {
  return new Promise((resolve) => {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        resolve(null)
        return
      }

      resolve(data)
    })
  })
}

function createStaticServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    if (!request.url) {
      response.writeHead(400)
      response.end('Bad Request')
      return
    }

    const requestUrl = new URL(request.url, 'http://127.0.0.1')
    const requestedPath = decodeURIComponent(requestUrl.pathname)
    const resolvedPath = path.resolve(rootDir, `.${requestedPath}`)
    const relativePath = path.relative(rootDir, resolvedPath)

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    const filePathStat = await new Promise((resolve) => {
      fs.stat(resolvedPath, (error, stats) => {
        resolve(error ? null : stats)
      })
    })

    let filePath = resolvedPath

    if (filePathStat?.isDirectory()) {
      filePath = path.join(resolvedPath, 'index.html')
    } else if (!filePathStat?.isFile()) {
      const hasFileExtension = path.extname(requestedPath).trim().length > 0
      if (hasFileExtension) {
        response.writeHead(404)
        response.end('Not Found')
        return
      }

      filePath = path.join(rootDir, 'index.html')
    }

    const fileBuffer = await readFileIfExists(filePath)

    if (!fileBuffer) {
      response.writeHead(404)
      response.end('Not Found')
      return
    }

    response.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-store',
    })
    response.end(fileBuffer)
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo iniciar el servidor local.'))
        return
      }

      resolve({
        close: () =>
          new Promise((closeResolve) => {
            server.close(() => closeResolve())
          }),
        url: `http://127.0.0.1:${address.port}`,
      })
    })
  })
}

function createWindow() {
  return new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#f8fafc',
    icon: getAppIconPath(),
    title: 'SiCoSe',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
}

async function loadAppWindow(window) {
  if (DEV_SERVER_URL) {
    await window.loadURL(DEV_SERVER_URL)
    return null
  }

  const frontendDistPath = getFrontendDistPath()
  const server = await createStaticServer(frontendDistPath)
  await window.loadURL(server.url)
  return server
}

async function bootstrap() {
  await app.whenReady()
  app.setAppUserModelId('mx.sicose.desktop')

  const window = createWindow()
  window.once('ready-to-show', () => {
    window.show()
  })

  const server = await loadAppWindow(window)

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  app.once('before-quit', () => {
    if (server) {
      void server.close()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const nextWindow = createWindow()
      void loadAppWindow(nextWindow)
      nextWindow.once('ready-to-show', () => {
        nextWindow.show()
      })
    }
  })
}

void bootstrap()

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
