interface EmptyStateProps {
  title: string
  message: string
  icon?: string
}

export const EmptyState = ({ title, message, icon = '📋' }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm text-center max-w-sm">{message}</p>
    </div>
  )
}
