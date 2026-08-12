import { spawn } from 'node:child_process'
import process from 'node:process'

const FRONTEND_URL = 'http://127.0.0.1:5173'
const BACKEND_HEALTH_URL = 'http://127.0.0.1:3000/api/health'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function waitFor(url, timeoutMs = 120000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // keep waiting
    }

    await sleep(1000)
  }

  throw new Error(`No se pudo detectar disponibilidad en ${url}`)
}

async function main() {
  await Promise.all([waitFor(FRONTEND_URL), waitFor(BACKEND_HEALTH_URL)])

  const electronProcess = spawn(
    process.platform === 'win32'
      ? 'node_modules/.bin/electron.cmd'
      : 'node_modules/.bin/electron',
    ['.'],
    {
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: FRONTEND_URL,
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )

  const shutdown = () => {
    if (!electronProcess.killed) {
      electronProcess.kill()
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  electronProcess.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

void main()
