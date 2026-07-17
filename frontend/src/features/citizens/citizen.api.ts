import { apiRequest } from '../../lib/api'
import type { CitizenFormValues, CitizenRecord } from './citizen.types'

type CitizenApiRecord = {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  direccion: string | null
  zona: string | null
  clave_catastral: string
  created_at: string
  updated_at: string
}

type CitizenListResponse = {
  data: CitizenApiRecord[]
  metadata: {
    pagina: number
    totalPaginas: number
  }
}

type CitizenResponse = {
  data: CitizenApiRecord
}

function toCitizenRecord(record: CitizenApiRecord): CitizenRecord {
  return {
    id: record.id,
    nombre: record.nombre,
    apellido: record.apellido,
    email: record.email,
    telefono: record.telefono ?? '',
    direccion: record.direccion ?? '',
    claveCatastral: record.clave_catastral,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function toApiPayload(values: CitizenFormValues) {
  return {
    nombre: values.nombre,
    apellido: values.apellido,
    email: values.email,
    telefono: values.telefono || undefined,
    direccion: values.direccion || undefined,
    clave_catastral: values.claveCatastral,
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchCitizens(token: string): Promise<CitizenRecord[]> {
  const records: CitizenApiRecord[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await apiRequest<CitizenListResponse>(
      `/api/ciudadanos?pagina=${page}&limite=100`,
      {
        headers: authHeaders(token),
      },
    )

    records.push(...response.data)
    totalPages = response.metadata.totalPaginas
    page += 1
  } while (page <= totalPages)

  return records.map(toCitizenRecord)
}

export async function createCitizen(
  token: string,
  values: CitizenFormValues,
): Promise<CitizenRecord> {
  const response = await apiRequest<CitizenResponse>('/api/ciudadanos', {
    method: 'POST',
    headers: authHeaders(token),
    body: toApiPayload(values),
  })

  return toCitizenRecord(response.data)
}

export async function updateCitizen(
  token: string,
  id: string,
  values: CitizenFormValues,
): Promise<CitizenRecord> {
  const response = await apiRequest<CitizenResponse>(
    `/api/ciudadanos/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: toApiPayload(values),
    },
  )

  return toCitizenRecord(response.data)
}

export async function deactivateCitizen(
  token: string,
  id: string,
): Promise<void> {
  await apiRequest<CitizenResponse>(
    `/api/ciudadanos/${encodeURIComponent(id)}/desactivar`,
    {
      method: 'PUT',
      headers: authHeaders(token),
    },
  )
}
