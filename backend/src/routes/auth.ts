import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signAuthToken, verifyAuthToken } from '../lib/jwt.js'
import { blacklistToken, isTokenBlacklisted } from '../lib/token-blacklist.js'
import { loginRateLimit, resetLoginEmailAttempts } from '../middleware/rate-limit.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function getBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return ''
  }

  return header.slice('Bearer '.length).trim()
}

export const authRouter = Router()

authRouter.post('/login', loginRateLimit, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid credentials payload',
        details: parsed.error.flatten(),
      })
    }

    const user = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    })

    const passwordHash = user?.passwordHash ?? ''
    const validPassword =
      Boolean(user?.activo) && (await bcrypt.compare(parsed.data.password, passwordHash))

    if (!user || !validPassword) {
      return response.status(401).json({
        error: 'Invalid email or password',
        code: 401,
      })
    }

    await resetLoginEmailAttempts(user.email)

    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      rol: user.rol,
    })

    return response.json({
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', async (request, response) => {
  const token = getBearerToken(request.headers.authorization)

  if (!token) {
    return response.status(401).json({
      error: 'Missing bearer token',
      code: 401,
    })
  }

  if (await isTokenBlacklisted(token)) {
    return response.status(401).json({
      error: 'Invalid or expired token',
      code: 401,
    })
  }

  try {
    const payload = await verifyAuthToken(token)
    const user = await prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    })

    if (!user) {
      return response.status(401).json({
        error: 'Invalid or expired token',
        code: 401,
      })
    }

    return response.json({
      data: user,
    })
  } catch {
    return response.status(401).json({
      error: 'Invalid or expired token',
      code: 401,
    })
  }
})

authRouter.post('/logout', async (request, response) => {
  const token = getBearerToken(request.headers.authorization)

  if (!token) {
    return response.status(401).json({
      error: 'Missing bearer token',
      code: 401,
    })
  }

  try {
    const payload = await verifyAuthToken(token)
    await blacklistToken(token, payload.exp)

    return response.json({
      message: 'Logout successful',
    })
  } catch {
    return response.status(401).json({
      error: 'Invalid or expired token',
      code: 401,
    })
  }
})
