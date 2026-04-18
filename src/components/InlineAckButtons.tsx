import { useState } from 'react'
import api from '../services/api'

interface InlineAckButtonsProps {
  expenseId: string
  onSuccess: () => void
}

export const InlineAckButtons = ({ expenseId, onSuccess }: InlineAckButtonsProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showComment, setShowComment] = useState<'accept' | 'dispute' | null>(null)
  const [comment, setComment] = useState('')

  const handleAck = async (action: 'accept' | 'dispute') => {
    if (action === 'dispute' && !comment) {
      setError('Por favor proporciona un comentario para disputar')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post(`/expenses/${expenseId}/acknowledge`, {
        action,
        comment: comment || undefined,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al procesar el gasto')
    } finally {
      setLoading(false)
    }
  }

  if (showComment === 'dispute') {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Por qué disputas este gasto?"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
          rows={2}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowComment(null)
              setComment('')
              setError('')
            }}
            disabled={loading}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleAck('dispute')}
            disabled={loading}
            className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Disputar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {error && <p className="text-red-600 text-sm w-full">{error}</p>}
      <button
        onClick={() => handleAck('accept')}
        disabled={loading}
        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Procesando...' : 'Aceptar'}
      </button>
      <button
        onClick={() => setShowComment('dispute')}
        disabled={loading}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
      >
        Disputar
      </button>
    </div>
  )
}
