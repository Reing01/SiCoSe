import { createApp } from './app.js'
import { env } from './config/env.js'
import { closeRedisClient } from './lib/redis.js'
import { prisma } from './lib/prisma.js'

const app = createApp()
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`SiCoSe backend running on http://0.0.0.0:${env.PORT}`)
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`Received ${signal}, shutting down gracefully`)

  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })

  await Promise.allSettled([prisma.$disconnect(), closeRedisClient()])
  process.exit(0)
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
