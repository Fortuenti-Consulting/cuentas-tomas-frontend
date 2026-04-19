import { useMemo } from 'react'
import { formatCOPShort } from '../utils/currency'

export interface MonthBucket {
  monthLabel: string // e.g. "abr"
  paid: number
  pending: number
}

interface TrendChartProps {
  data: MonthBucket[]
}

// Hand-rolled SVG bar chart — avoids adding Recharts/VictoryJS as a dependency.
export const TrendChart = ({ data }: TrendChartProps) => {
  const { max, points } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.paid + d.pending))
    return { max, points: data }
  }, [data])

  if (data.length === 0) {
    return null
  }

  const total = data.reduce((sum, d) => sum + d.paid + d.pending, 0)
  const totalPaid = data.reduce((sum, d) => sum + d.paid, 0)
  const totalPending = data.reduce((sum, d) => sum + d.pending, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">
            Últimos 6 meses
          </h3>
          <p className="text-sm text-gray-500">
            Pagado vs pendiente por mes
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600" />
            Pagado <span className="font-semibold">{formatCOPShort(totalPaid)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-300" />
            Pendiente <span className="font-semibold">{formatCOPShort(totalPending)}</span>
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          Sin actividad registrada en este rango.
        </p>
      ) : (
        <div className="flex items-end gap-2 sm:gap-3 h-32 sm:h-40">
          {points.map((p, i) => {
            const totalMonth = p.paid + p.pending
            const totalPct = (totalMonth / max) * 100
            const paidPct = totalMonth > 0 ? (p.paid / totalMonth) * 100 : 0
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
              >
                <span className="text-[10px] sm:text-xs text-gray-500 tabular-nums">
                  {formatCOPShort(totalMonth)}
                </span>
                <div
                  className="w-full max-w-[60px] flex flex-col-reverse rounded-t overflow-hidden bg-gray-100 relative"
                  style={{ height: `${Math.max(6, totalPct)}%` }}
                  role="img"
                  aria-label={`${p.monthLabel}: ${formatCOPShort(p.paid)} pagado, ${formatCOPShort(p.pending)} pendiente`}
                >
                  {p.paid > 0 && (
                    <div
                      className="bg-indigo-600 transition-all duration-500"
                      style={{ height: `${paidPct}%` }}
                    />
                  )}
                  {p.pending > 0 && (
                    <div
                      className="bg-gray-300 transition-all duration-500"
                      style={{ height: `${100 - paidPct}%` }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 capitalize">
                  {p.monthLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
