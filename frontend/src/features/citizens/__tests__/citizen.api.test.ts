import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../../lib/api'
import { createCitizen, fetchCitizens } from '../citizen.api'

function citizenResponse(id: string) {
  return {
    id,
    nombre: 'Mariana',
    apellido: 'Lopez Torres',
    email: 'mariana@sicose.test',
    telefono: null,
    direccion: null,
    zona: null,
    clave_catastral: `CAT-${id}`,
    created_at: '2026-07-17T12:00:00.000Z',
    updated_at: '2026-07-17T12:00:00.000Z',
  }
}

describe('citizen.api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads every page and maps backend field names', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          data: [citizenResponse('1')],
          metadata: { pagina: 1, totalPaginas: 2 },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [citizenResponse('2')],
          metadata: { pagina: 2, totalPaginas: 2 },
        }),
      )

    const records = await fetchCitizens('token-demo')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/api/ciudadanos?pagina=1&limite=100`,
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${API_BASE_URL}/api/ciudadanos?pagina=2&limite=100`,
    )
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      id: '1',
      telefono: '',
      direccion: '',
      claveCatastral: 'CAT-1',
      createdAt: '2026-07-17T12:00:00.000Z',
    })
  })

  it('serializes a citizen creation payload for the backend', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          data: citizenResponse('created'),
        },
        { status: 201 },
      ),
    )

    await createCitizen('token-demo', {
      nombre: 'Mariana',
      apellido: 'Lopez Torres',
      email: 'mariana@sicose.test',
      telefono: '',
      direccion: '',
      claveCatastral: 'CAT-created',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)

    expect(url).toBe(`${API_BASE_URL}/api/ciudadanos`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(headers.get('Authorization')).toBe('Bearer token-demo')
    expect(JSON.parse(String(init.body))).toEqual({
      nombre: 'Mariana',
      apellido: 'Lopez Torres',
      email: 'mariana@sicose.test',
      clave_catastral: 'CAT-created',
    })
  })
})
