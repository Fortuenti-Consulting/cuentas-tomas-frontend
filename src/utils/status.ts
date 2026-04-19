import { Clock, Check, AlertTriangle, CreditCard, MinusCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ObligationStatus = 'pending' | 'settled' | 'overdue' | 'partial' | 'waived'

export interface StatusDisplay {
  label: string
  color: string
  Icon: LucideIcon
}

export function formatObligationStatus(status: ObligationStatus | string): StatusDisplay {
  const statusMap: Record<string, StatusDisplay> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', Icon: Clock },
    settled: { label: 'Pagado', color: 'bg-green-100 text-green-800', Icon: Check },
    overdue: { label: 'Vencido', color: 'bg-red-100 text-red-800', Icon: AlertTriangle },
    partial: { label: 'Parcial', color: 'bg-blue-100 text-blue-800', Icon: CreditCard },
    waived: { label: 'Condonado', color: 'bg-gray-100 text-gray-800', Icon: MinusCircle },
  }
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', Icon: Clock }
}

export interface StatusBadgeProps {
  status: ObligationStatus | string
}

export function getStatusBadgeClasses(color: string): string {
  return `inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${color}`
}
