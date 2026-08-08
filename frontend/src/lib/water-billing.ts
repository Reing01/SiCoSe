const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export const MONTHLY_WATER_FEE_MXN = 30

export type MonthlyPeriod = {
  key: string
  year: number
  month: number
  label: string
  fullLabel: string
}

export function formatPeriodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatPeriodLabel(year: number, month: number) {
  const monthLabel = MONTH_NAMES[month - 1] ?? 'mes'
  return `${monthLabel} ${year}`
}

export function buildMonthlyPeriods(
  startYear = 2025,
  startMonth = 1,
  endDate = new Date(),
) {
  const periods: MonthlyPeriod[] = []
  let year = startYear
  let month = startMonth
  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth() + 1

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push({
      key: formatPeriodKey(year, month),
      year,
      month,
      label: MONTH_NAMES[month - 1] ?? 'mes',
      fullLabel: formatPeriodLabel(year, month),
    })

    month += 1

    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return periods
}
