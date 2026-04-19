import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Check, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toast: (message: string) => console.info('[toast]', message),
    }
  }
  return ctx
}

const TOAST_DURATION = 3500

const iconMap: Record<ToastKind, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const colorMap: Record<ToastKind, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconColorMap: Record<ToastKind, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, kind, message }])
      window.setTimeout(() => remove(id), TOAST_DURATION)
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  )
}

const ToastViewport = ({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) => {
  return (
    <div
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      className="fixed top-2 right-2 sm:top-4 sm:right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none max-w-sm w-[calc(100%-1rem)]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: number) => void
}) => {
  const Icon = iconMap[toast.kind]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div
      role="status"
      className={`pointer-events-auto w-full shadow-lg border rounded-lg px-4 py-3 flex items-start gap-3 transition-all duration-200 ${
        colorMap[toast.kind]
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorMap[toast.kind]}`} />
      <p className="flex-1 text-sm font-medium break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar"
        className="p-0.5 -m-0.5 rounded hover:bg-black/5 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
