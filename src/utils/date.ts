const monthNames = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const monthNamesLong = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const parse = (input: string | Date): Date => (input instanceof Date ? input : new Date(input))

// 4 abr 2026
export const formatDateShort = (input: string | Date): string => {
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

// 4 de abril de 2026
export const formatDateLong = (input: string | Date): string => {
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} de ${monthNamesLong[d.getMonth()]} de ${d.getFullYear()}`
}

// 4 abr 2026, 02:46 p. m.
export const formatDateTime = (input: string | Date): string => {
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${formatDateShort(d)}, ${time}`
}

// Days from today to target date (negative = in the past)
export const daysUntil = (input: string | Date): number => {
  const target = parse(input)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Human-friendly relative label (e.g. "en 3 días", "hace 5 días", "hoy")
export const relativeDays = (input: string | Date): string => {
  const diff = daysUntil(input)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff > 0) return `en ${diff} días`
  return `hace ${Math.abs(diff)} días`
}
