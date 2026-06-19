import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CitizenManagementPanel, {
  validateCitizenForm,
} from '../CitizenManagementPanel'

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
  it('renders the seed list and supports filtering', () => {
    render(<CitizenManagementPanel />)

    expect(
      screen.getByText(/mariana lopez torres/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/total ciudadanos/i)).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /requieren atencion/i }),
    )

    expect(screen.getByText(/esperanza mendez lara/i)).toBeInTheDocument()
    expect(screen.queryByText(/mariana lopez torres/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when the form is submitted empty', () => {
    render(<CitizenManagementPanel />)

    fireEvent.click(
      screen.getByRole('button', { name: /crear ciudadano/i }),
    )

    expect(
      screen.getByText('Corrige los campos marcados para continuar.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresa un nombre valido.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un apellido valido.')).toBeInTheDocument()
  })

  it('creates a new citizen after validation', async () => {
    render(<CitizenManagementPanel />)

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
    fireEvent.click(
      screen.getByRole('button', { name: /crear ciudadano/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/ciudadano creado correctamente/i),
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/luis garcia perez/i)).toBeInTheDocument()
    expect(
      screen.getByRole('row', { name: /luis garcia perez/i }),
    ).toBeInTheDocument()
  })

  it('edits and deletes a citizen from the table', async () => {
    render(<CitizenManagementPanel />)

    fireEvent.click(
      screen.getByRole('button', { name: /editar jose ramirez hernandez/i }),
    )
    fireEvent.change(screen.getByLabelText(/nombre \*/i), {
      target: { value: 'Jose Alfredo' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /guardar cambios/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/ciudadano actualizado correctamente/i),
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/jose alfredo ramirez hernandez/i)).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /eliminar jose alfredo ramirez hernandez/i }),
    )

    await waitFor(() => {
      expect(
        screen.queryByText(/jose alfredo ramirez hernandez/i),
      ).not.toBeInTheDocument()
    })
  })
})
