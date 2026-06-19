import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CitizenManagementPage from '../CitizenManagementPage'

describe('CitizenManagementPage', () => {
  it('renders the management hero and panel', () => {
    render(<CitizenManagementPage />)

    expect(
      screen.getByRole('heading', {
        name: /gestion de ciudadanos con busqueda, edicion y validacion local/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('ACT-7 - Issue #009')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nuevo ciudadano/i }),
    ).toBeInTheDocument()
  })
})
