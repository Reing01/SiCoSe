import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

type Citizen = {
  nombre: string
  apellido: string
  clave_catastral: string
  zona: string
  activo: boolean
}

const citizens: Citizen[] = [
  {
    nombre: 'Maria',
    apellido: 'Gonzalez',
    clave_catastral: 'CAT-0001',
    zona: 'Centro',
    activo: true,
  },
  {
    nombre: 'Jose',
    apellido: 'Ramirez',
    clave_catastral: 'CAT-0002',
    zona: 'Norte',
    activo: true,
  },
  {
    nombre: 'Ana',
    apellido: 'Lopez',
    clave_catastral: 'CAT-0003',
    zona: 'Sur',
    activo: true,
  },
]

function searchCitizens(search: string) {
  const normalized = search.toLowerCase()

  return citizens.filter(
    (citizen) =>
      citizen.activo &&
      (citizen.nombre.toLowerCase().includes(normalized) ||
        citizen.apellido.toLowerCase().includes(normalized) ||
        citizen.clave_catastral === search),
  )
}

describe('ciudadanos search criteria', () => {
  it('finds three distinct citizens by partial name and exact cadastral key', () => {
    assert.equal(searchCitizens('mar').at(0)?.nombre, 'Maria')
    assert.equal(searchCitizens('RAM').at(0)?.apellido, 'Ramirez')
    assert.equal(searchCitizens('CAT-0003').at(0)?.nombre, 'Ana')
  })
})
