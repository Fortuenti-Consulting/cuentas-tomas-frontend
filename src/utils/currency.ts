export const formatCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatCOPShort = (amount: number): string => {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const rounded = m >= 10 ? Math.round(m) : Math.round(m * 10) / 10
    return `${sign}$${rounded}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    const rounded = k >= 10 ? Math.round(k) : Math.round(k * 10) / 10
    return `${sign}$${rounded}K`
  }
  return formatCOP(amount)
}
