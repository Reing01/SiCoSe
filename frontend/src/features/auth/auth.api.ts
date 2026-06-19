import { apiRequest } from '../../lib/api'
import type {
  AuthMeResponse,
  AuthRole,
  AuthSession,
  LoginRequest,
  LoginResponse,
} from './auth.types'

export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function getCurrentUser(token: string): Promise<AuthSession> {
  const response = await apiRequest<AuthMeResponse>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return {
    token,
    user: {
      email: response.data.email,
      rol: response.data.rol as AuthRole,
    },
  }
}

export async function logout(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

