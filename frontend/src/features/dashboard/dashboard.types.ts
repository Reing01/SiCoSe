export type DashboardTrend = {
  direccion: 'mejora' | 'empeora' | 'estable'
  color: 'verde' | 'rojo' | 'amarillo'
  montoMesAnterior: number
}

export type DashboardMetrics = {
  periodo: string
  totalRecaudadoMes: number
  porcentajeCobertura: number
  numeroMorosos: number
  comparativoMesAnterior: number
  totalAdeudosMes: number
  pagosRegistradosMes: number
  variacion: DashboardTrend
  ultimaActualizacion: string
  cache: {
    hit: boolean
    ttlSegundos: number
  }
}
