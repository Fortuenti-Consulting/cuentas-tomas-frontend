import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  message: string
  Icon?: LucideIcon
  action?: ReactNode
}

export const EmptyState = ({ title, message, Icon, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-14 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1.5">{title}</h3>
      <p className="text-gray-600 text-sm max-w-sm mb-4">{message}</p>
      {action}
    </div>
  )
}
