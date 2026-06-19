import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)

export type AuthTokenPayload = {
  sub: string
  email: string
  rol: string
}

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({ email: payload.email, rol: payload.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(env.JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret)
}

export async function verifyAuthToken(token: string) {
  const result = await jwtVerify(token, secret, {
    issuer: env.JWT_ISSUER,
  })

  return {
    sub: result.payload.sub ?? '',
    email: String(result.payload.email ?? ''),
    rol: String(result.payload.rol ?? ''),
    exp: Number(result.payload.exp ?? 0),
  }
}
