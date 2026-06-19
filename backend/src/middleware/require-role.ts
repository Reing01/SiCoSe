import type { NextFunction, Response } from 'express'
import { verifyAuthToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { isTokenBlacklisted } from '../lib/token-blacklist.js'
import type { AuthenticatedRequest, UserRole } from '../types/auth.js'

function getBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return ''
  }

  return header.slice('Bearer '.length).trim()
}

function isKnownRole(role: string): role is UserRole {
  return role === 'admin' || role === 'tesorero' || role === 'secretaria'
}

export async function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
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

    if (!isKnownRole(payload.rol)) {
      return response.status(403).json({
        error: 'Forbidden role',
        code: 403,
      })
    }

    const user = await prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        rol: true,
      },
    })

    if (!user || !isKnownRole(user.rol)) {
      return response.status(401).json({
        error: 'Invalid or expired token',
        code: 401,
      })
    }

    request.user = {
      id: user.id,
      email: user.email,
      rol: user.rol,
    }

    return next()
  } catch {
    return response.status(401).json({
      error: 'Invalid or expired token',
      code: 401,
    })
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) {
      return response.status(401).json({
        error: 'Authentication required',
        code: 401,
      })
    }

    if (!roles.includes(request.user.rol)) {
      return response.status(403).json({
        error: 'Forbidden role',
        code: 403,
      })
    }

    return next()
  }
}
