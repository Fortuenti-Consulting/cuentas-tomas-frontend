interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  )
}

export const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="w-4 h-4 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-8 w-24" />
    <Skeleton className="h-3 w-40" />
  </div>
)

export const SkeletonRow = () => (
  <div className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg">
    <div className="space-y-2 flex-1 min-w-0">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
    <Skeleton className="h-8 w-24" />
  </div>
)

export const SkeletonPage = ({ title = true, cards = 3 }: { title?: boolean; cards?: number }) => (
  <div className="space-y-5 sm:space-y-6 animate-pulse" aria-label="Cargando..." aria-busy="true">
    {title && <Skeleton className="h-8 w-56" />}
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cards} gap-3 sm:gap-4`}>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <div className="space-y-3">
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  </div>
)
