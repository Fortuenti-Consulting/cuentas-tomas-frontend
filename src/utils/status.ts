export type ObligationStatus = 'pending' | 'settled' | 'overdue' | 'partial' | 'waived'

export interface StatusDisplay {
  label: string
  color: string
}

export function formatObligationStatus(status: ObligationStatus | string): StatusDisplay {
  const statusMap: Record<string, StatusDisplay> = {
    'pending': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    'settled': { label: 'Pagado', color: 'bg-green-100 text-green-800' },
    'overdue': { label: 'Vencido', color: 'bg-red-100 text-red-800' },
    'partial': { label: 'Parcial', color: 'bg-blue-100 text-blue-800' },
    'waived': { label: 'Condonado', color: 'bg-gray-100 text-gray-800' },
  }
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
}
