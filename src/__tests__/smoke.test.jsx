import { describe, it, expect } from 'vitest'

describe('Entorno de pruebas SiCoSe', () => {
  it('Vitest está configurado correctamente', () => {
    expect(true).toBe(true)
  })

  it('Operaciones básicas funcionan', () => {
    expect(2 + 2).toBe(4)
  })

  it('String operations', () => {
    expect('SiCoSe'.toLowerCase()).toBe('sicose')
  })
})