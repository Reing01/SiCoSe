import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authStorageKeys } from '../../auth/auth.session'
import { citizenSeed } from '../citizen.seed'
import * as citizenApi from '../citizen.api'
import * as citizenHistoryApi from '../citizen-history.api'
import CitizenManagementPanel from '../CitizenManagementPanel'
import { validateCitizenForm } from '../citizen-form.validation'

vi.mock('../citizen.api')
vi.mock('../citizen-history.api')

function persistSecretarySession() {
  window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
  window.sessionStorage.setItem(
    authStorageKeys.user,
    JSON.stringify({
      email: 'secretaria@sicose.test',
      rol: 'secretaria',
    }),
  )
}

describe('validateCitizenForm', () => {
  it('returns validation errors for empty values', () => {
    expect(
      validateCitizenForm({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        claveCatastral: '',
      }),
    ).toEqual({
      nombre: 'Ingresa un nombre valido.',
      apellido: 'Ingresa un apellido valido.',
      email: 'Ingresa un correo electronico.',
      claveCatastral: 'Ingresa la clave catastral.',
    })
  })

  it('accepts a valid citizen form', () => {
    expect(
      validateCitizenForm({
        nombre: 'Mariana',
        apellido: 'Lopez Torres',
        email: 'mariana.lopez@sicose.mx',
        telefono: '222 111 0101',
        direccion: 'Av. Hidalgo 14',
        claveCatastral: 'sdc-72810-001',
      }),
    ).toEqual({})
  })
})

describe('CitizenManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    persistSecretarySession()
    vi.mocked(citizenHistoryApi.fetchCitizenHistory).mockResolvedValue({
      ciudadanoId: 'CIT-002',
          adeudos: [
        {
          id: 'adeudo-1',
          periodo: '2026-06',
          monto: 30,
          vencimiento: '2026-06-30T00:00:00.000Z',
          estado: 'pagado',
          pagado: true,
          ciudadanoId: 'CIT-002',
              servicioId: 'serv-1',
              servicio: {
                id: 'serv-1',
                nombre: 'Agua potable',
                tarifa: 30,
              },
            },
          ],
      pagos: [
        {
          id: 'pago-1',
          ciudadanoId: 'CIT-002',
          adeudoId: 'adeudo-1',
          monto: 30,
          fecha: '2026-06-15T12:00:00.000Z',
          metodo: 'efectivo',
          folio: 'SCS-2026-000001',
          recibo: 'SCS-2026-000001',
          creado_por: 'user-1',
          adeudo: {
            id: 'adeudo-1',
            periodo: '2026-06',
            monto: 30,
            servicio: {
              id: 'serv-1',
              nombre: 'Agua potable',
              tarifa: 30,
            },
          },
          comprobantes: [],
        },
      ],
      historial: [],
    })
    vi.mocked(citizenApi.fetchCitizenPage).mockResolvedValue({
      records: citizenSeed.map((record) => ({ ...record, activo: true })),
      metadata: {
        total: citizenSeed.length,
        pagina: 1,
        limite: 10,
        totalPaginas: 1,
      },
    })
    vi.mocked(citizenApi.createCitizen).mockImplementation(
      async (_token, values) => ({
        id: 'citizen-created',
        ...values,
        activo: true,
        createdAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:00:00.000Z',
      }),
    )
    vi.mocked(citizenApi.updateCitizen).mockImplementation(
      async (_token, id, values) => ({
        id,
        ...values,
        activo: true,
        createdAt: '2026-05-03T10:00:00.000Z',
        updatedAt: '2026-07-17T12:00:00.000Z',
      }),
    )
    vi.mocked(citizenApi.deactivateCitizen).mockResolvedValue()
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the backend list and supports filtering', async () => {
    render(<CitizenManagementPanel />)

    expect(await screen.findByText(/mariana lopez torres/i)).toBeInTheDocument()
    expect(screen.getByText(/total ciudadanos/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /requieren atencion/i }))

    expect(screen.getByText(/esperanza mendez lara/i)).toBeInTheDocument()
    expect(screen.queryByText(/mariana lopez torres/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when the form is submitted empty', async () => {
    render(<CitizenManagementPanel />)

    await screen.findByText(/mariana lopez torres/i)

    fireEvent.click(screen.getByRole('button', { name: /crear ciudadano/i }))

    expect(
      screen.getByText('Corrige los campos marcados para continuar.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresa un nombre valido.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un apellido valido.')).toBeInTheDocument()
  })

  it('creates a new citizen after validation', async () => {
    render(<CitizenManagementPanel />)

    await screen.findByText(/mariana lopez torres/i)

    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Luis' },
    })
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'Garcia Perez' },
    })
    fireEvent.change(screen.getByLabelText(/correo electronico \*/i), {
      target: { value: 'luis.garcia@sicose.mx' },
    })
    fireEvent.change(screen.getByLabelText(/telefono \(opcional\)/i), {
      target: { value: '222 333 4444' },
    })
    fireEvent.change(screen.getByLabelText(/direccion \(opcional\)/i), {
      target: { value: 'Calle Reforma 10' },
    })
    fireEvent.change(screen.getByLabelText(/clave catastral \*/i), {
      target: { value: 'SDC-72810-006' },
    })
    fireEvent.click(screen.getByRole('button', { name: /crear ciudadano/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/ciudadano creado correctamente/i),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole('row', { name: /luis garcia perez/i }),
    ).toBeInTheDocument()
    expect(citizenApi.createCitizen).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        email: 'luis.garcia@sicose.mx',
        claveCatastral: 'SDC-72810-006',
      }),
    )
  })

  it('edits and deletes a citizen from the table', async () => {
    render(<CitizenManagementPanel />)

    await screen.findByText(/jose ramirez hernandez/i)

    fireEvent.click(
      screen.getByRole('button', { name: /editar jose ramirez hernandez/i }),
    )
    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Jose Alfredo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/ciudadano actualizado correctamente/i),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText(/jose alfredo ramirez hernandez/i),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /eliminar jose alfredo ramirez hernandez/i,
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /eliminar jose alfredo ramirez hernandez/i }),
      ).toHaveTextContent(/inactivo/i)
    })

    expect(citizenApi.updateCitizen).toHaveBeenCalled()
    expect(citizenApi.deactivateCitizen).toHaveBeenCalledWith(
      'test-token',
      'CIT-002',
    )
  })
})
