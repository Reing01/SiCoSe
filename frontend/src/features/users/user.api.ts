import { apiRequest } from '../../lib/api'
import type { SystemUserRecord, SystemUserRole } from './user.types'

type UserApiRecord = {
  id: string
  email: string
  nombre: string
  rol: SystemUserRole
  activo: boolean
  created_at: string
  updated_at: string
}

type UsersListResponse = {
  data: UserApiRecord[]
  metadata: {
    total: number
    pagina: number
    limite: number
    totalPaginas: number
  }
}

type UserResponse = {
  data: UserApiRecord
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

function toUserRecord(record: UserApiRecord): SystemUserRecord {
  return {
    id: record.id,
    email: record.email,
    nombre: record.nombre,
    rol: record.rol,
    activo: record.activo,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export async function fetchUsers(token: string) {
  const records: UserApiRecord[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await apiRequest<UsersListResponse>(
      `/api/usuarios?pagina=${page}&limite=100`,
      {
        headers: authHeaders(token),
      },
    )

    records.push(...response.data)
    totalPages = Math.max(1, response.metadata.totalPaginas)
    page += 1
  } while (page <= totalPages)

  return records.map(toUserRecord)
}

export async function createUser(
  token: string,
  input: {
    email: string
    nombre: string
    rol: SystemUserRole
    password: string
  },
) {
  const response = await apiRequest<UserResponse>('/api/usuarios', {
    method: 'POST',
    headers: authHeaders(token),
    body: {
      email: input.email,
      nombre: input.nombre,
      rol: input.rol,
      password: input.password,
    },
  })

  return toUserRecord(response.data)
}

export async function updateUser(
  token: string,
  id: string,
  input: Partial<{
    email: string
    nombre: string
    rol: SystemUserRole
    activo: boolean
  }>,
) {
  const response = await apiRequest<UserResponse>(
    `/api/usuarios/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: input,
    },
  )

  return toUserRecord(response.data)
}

export async function deactivateUser(token: string, id: string) {
  const response = await apiRequest<UserResponse>(
    `/api/usuarios/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  )

  return toUserRecord(response.data)
}
