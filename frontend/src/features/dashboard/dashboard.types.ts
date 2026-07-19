export type DashboardTrend = {
  direccion: 'mejora' | 'empeora' | 'estable'
  color: 'verde' | 'rojo' | 'amarillo'
  montoMesAnterior: number
}

export type DashboardMetrics = {
  periodo: string
  totalRecaudadoMes: number
  totalPendienteMes: number | null
  porcentajeCobertura: number
  numeroMorosos: number
  comparativoMesAnterior: number
  totalAdeudosMes: number
  adeudosPagadosMes: number
  pagosRegistradosMes: number
  historicoRecaudacion: Array<{
    periodo: string
    total: number
  }>
  variacion: DashboardTrend
  ultimaActualizacion: string
  cache: {
    hit: boolean
    ttlSegundos: number
  }
}
