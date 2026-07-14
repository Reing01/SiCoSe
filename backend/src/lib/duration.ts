const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
}

/**
 * Convierte strings de duración tipo "7d", "8h", "30m", "45s" (o un número
 * plano en segundos) a segundos. Lanza si el formato no es reconocido.
 */
export function parseDurationToSeconds(value: string): number {
  const trimmed = value.trim()

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  const match = /^(\d+)\s*([smhd])$/i.exec(trimmed)

  if (!match) {
    throw new Error(`Invalid duration format: ${value}`)
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()

  return amount * UNIT_SECONDS[unit]
}