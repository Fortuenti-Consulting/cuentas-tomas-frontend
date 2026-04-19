import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import api from '../services/api'

interface Notification {
  id: string
  kind: string
  payload_json: string
  read_at: string | null
  created_at: string
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications')
        const data = response.data as Notification[]
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read_at).length)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const markAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationMessage = (notification: Notification): string => {
    try {
      const payload = JSON.parse(notification.payload_json)
      switch (notification.kind) {
        case 'obligation_due_soon':
          return `Recordatorio: ${payload.concept} por ${payload.amount_cop} vence en 3 dias`
        case 'payment_overdue':
          return `Pago vencido: ${payload.concept} vencido hace ${payload.days_overdue} dias`
        case 'expense_pending_ack':
          return `Tienes ${payload.count} gasto(s) esperando aprobacion`
        case 'expense_accepted':
          return `${payload.concept} ha sido aceptado`
        case 'expense_disputed':
          return `${payload.concept} ha sido impugnado`
        default:
          return 'Nueva notificacion'
      }
    } catch {
      return 'Nueva notificacion'
    }
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={
          unreadCount > 0
            ? `Notificaciones (${unreadCount} sin leer)`
            : 'Notificaciones'
        }
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-label="Notificaciones"
            className="fixed right-0 top-0 h-full w-full sm:w-96 max-w-full bg-white shadow-xl z-50 flex flex-col overflow-hidden"
            style={{ maxHeight: '100vh' }}
          >
            {/* Header */}
            <div className="border-b border-gray-100 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No tienes notificaciones nuevas
              </div>
            ) : (
              <div>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      !notification.read_at ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read_at && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString('es-CO')}{' '}
                          {new Date(notification.created_at).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* Footer */}
            {unreadCount > 0 && (
              <div className="border-t border-gray-100 p-4">
                <button
                  onClick={markAllAsRead}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Marcar todo como leído
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
