import { useState, useEffect, useRef } from 'react'
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
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <div
          ref={drawerRef}
          className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: '100vh' }}
        >
          {/* Header */}
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
            <div className="border-t p-4">
              <button
                onClick={markAllAsRead}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Marcar todo como leido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
