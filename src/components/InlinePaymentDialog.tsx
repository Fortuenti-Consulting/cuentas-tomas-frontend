import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import api from '../services/api'
import { formatCOP } from '../utils/currency'
import { useToast } from './Toast'

interface InlinePaymentDialogProps {
  obligationId: string
  obligationLabel: string
  amount: number
  onClose: () => void
  onSuccess: () => void
}

export const InlinePaymentDialog = ({
  obligationId,
  obligationLabel,
  amount,
  onClose,
  onSuccess,
}: InlinePaymentDialogProps) => {
  const { toast } = useToast()
  const [reference, setReference] = useState('')
  const [proofLink, setProofLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    // prevent body scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = prev
    }
  }, [loading, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount || amount <= 0) {
      setError('No se puede registrar un pago para una obligación sin monto')
      return
    }

    if (!proofLink) {
      setError('Por favor proporciona un enlace de comprobante')
      return
    }

    setLoading(true)
    try {
      await api.post('/payments', {
        amount_cop: amount,
        paid_on: new Date().toISOString().split('T')[0],
        method: 'bancolombia_transfer',
        reference: reference || undefined,
        proof_link: proofLink,
        applied_to_obligation_id: obligationId,
      })
      toast(`Pago registrado: ${formatCOP(amount)}`, 'success')
      onSuccess()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al registrar el pago'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 transition-opacity"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-dialog-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-lg shadow-2xl p-5 sm:p-6 transform transition-transform">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h3
              id="payment-dialog-title"
              className="text-lg font-bold text-gray-800"
            >
              Registrar pago
            </h3>
            <p className="text-sm text-gray-500">Responsable: Ricardo</p>
            <p className="text-sm text-gray-700 font-medium mt-1 truncate">{obligationLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
            className="p-1 -m-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input
              type="text"
              value={formatCOP(amount)}
              disabled
              aria-label="Monto a pagar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia (opcional)
            </label>
            <input
              ref={firstFieldRef}
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ref. Bancolombia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enlace de comprobante *
            </label>
            <input
              type="url"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loading ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
