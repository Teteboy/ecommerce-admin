import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  // Initialize socket connection
  const initialize = () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    socket.value = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('Connected to notification server')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('Disconnected from notification server')
    })

    socket.value.on('new_order', (data) => {
      addNotification({
        type: 'info',
        title: 'New Order',
        message: `Order #${data.orderNumber} received for €${data.total}`,
        timestamp: new Date()
      })
    })

    socket.value.on('order_status_update', (data) => {
      addNotification({
        type: 'success',
        title: 'Order Updated',
        message: `Order #${data.orderNumber} status changed to ${data.status}`,
        timestamp: new Date()
      })
    })

    socket.value.on('low_stock_alert', (data) => {
      addNotification({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${data.productName} is running low (${data.stockQuantity} remaining)`,
        timestamp: new Date()
      })
    })

    socket.value.on('user_activity', (data) => {
      addNotification({
        type: 'info',
        title: 'User Activity',
        message: data.message,
        timestamp: new Date()
      })
    })
  }

  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      read: false,
      ...notification
    }

    notifications.value.unshift(newNotification)

    // Keep only last 50 notifications
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      })
    }
  }

  // Mark notification as read
  const markAsRead = (id: string) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    notifications.value.forEach(notification => {
      notification.read = true
    })
  }

  // Remove notification
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  // Clear all notifications
  const clearAll = () => {
    notifications.value = []
  }

  // Get unread count
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  // Request notification permission
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  // Cleanup
  const cleanup = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  return {
    notifications,
    isConnected,
    unreadCount,
    initialize,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    requestPermission,
    cleanup
  }
})