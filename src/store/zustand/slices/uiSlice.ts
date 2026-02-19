import { StateCreator } from 'zustand'
import { RootState } from '../index'

export interface NotificationState {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  persistent: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }>
}

export interface ModalState {
  id: string
  component: string
  props?: any
  backdrop?: boolean
  persistent?: boolean
}

export interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto'
  colorScheme: 'orange' | 'blue' | 'green' | 'purple'
  fontSize: 'small' | 'medium' | 'large'
  
  // Layout
  sidebarCollapsed: boolean
  sidebarPinned: boolean
  compactMode: boolean
  fullscreen: boolean
  
  // Navigation
  currentPage: string
  breadcrumbs: Array<{
    label: string
    href: string
  }>
  
  // Notifications
  notifications: NotificationState[]
  notificationSettings: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
    autoHide: boolean
    hideDelay: number
  }
  
  // Modals and overlays
  modals: ModalState[]
  loading: {
    global: boolean
    page: boolean
    components: Record<string, boolean>
  }
  
  // User preferences
  preferences: {
    animations: boolean
    reducedMotion: boolean
    highContrast: boolean
    autoSave: boolean
    confirmActions: boolean
    showTooltips: boolean
  }
  
  // Dashboard layout
  dashboardLayout: {
    widgets: Array<{
      id: string
      type: string
      position: { x: number; y: number }
      size: { width: number; height: number }
      visible: boolean
      settings?: any
    }>
    columns: number
    compact: boolean
  }
  
  // Terminal settings
  terminal: {
    fontSize: number
    fontFamily: string
    cursorStyle: 'block' | 'underline' | 'bar'
    theme: 'dark' | 'light' | 'bloomberg'
    opacity: number
  }
  
  // Charts and data visualization
  charts: {
    defaultTimeframe: '1D' | '1W' | '1M' | '3M' | '1Y'
    candlestickStyle: 'candles' | 'line' | 'area'
    indicators: string[]
    showVolume: boolean
    showGrid: boolean
  }
}

export interface UIActions {
  // Theme actions
  setTheme: (theme: UIState['theme']) => void
  setColorScheme: (scheme: UIState['colorScheme']) => void
  setFontSize: (size: UIState['fontSize']) => void
  
  // Layout actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarPin: () => void
  setCompactMode: (compact: boolean) => void
  toggleFullscreen: () => void
  
  // Navigation actions
  setCurrentPage: (page: string) => void
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void
  addBreadcrumb: (breadcrumb: UIState['breadcrumbs'][0]) => void
  
  // Notification actions
  addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  updateNotificationSettings: (settings: Partial<UIState['notificationSettings']>) => void
  
  // Modal actions
  openModal: (modal: Omit<ModalState, 'id'>) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  setPageLoading: (loading: boolean) => void
  setComponentLoading: (component: string, loading: boolean) => void
  
  // Preferences actions
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void
  
  // Dashboard layout actions
  updateDashboardLayout: (layout: Partial<UIState['dashboardLayout']>) => void
  addWidget: (widget: UIState['dashboardLayout']['widgets'][0]) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, updates: Partial<UIState['dashboardLayout']['widgets'][0]>) => void
  
  // Terminal actions
  updateTerminalSettings: (settings: Partial<UIState['terminal']>) => void
  
  // Chart actions
  updateChartSettings: (settings: Partial<UIState['charts']>) => void
}

export interface UISlice {
  ui: UIState
  setTheme: UIActions['setTheme']
  setColorScheme: UIActions['setColorScheme']
  setFontSize: UIActions['setFontSize']
  toggleSidebar: UIActions['toggleSidebar']
  setSidebarCollapsed: UIActions['setSidebarCollapsed']
  toggleSidebarPin: UIActions['toggleSidebarPin']
  setCompactMode: UIActions['setCompactMode']
  toggleFullscreen: UIActions['toggleFullscreen']
  setCurrentPage: UIActions['setCurrentPage']
  setBreadcrumbs: UIActions['setBreadcrumbs']
  addBreadcrumb: UIActions['addBreadcrumb']
  addNotification: UIActions['addNotification']
  removeNotification: UIActions['removeNotification']
  markNotificationRead: UIActions['markNotificationRead']
  markAllNotificationsRead: UIActions['markAllNotificationsRead']
  clearNotifications: UIActions['clearNotifications']
  updateNotificationSettings: UIActions['updateNotificationSettings']
  openModal: UIActions['openModal']
  closeModal: UIActions['closeModal']
  closeAllModals: UIActions['closeAllModals']
  setGlobalLoading: UIActions['setGlobalLoading']
  setPageLoading: UIActions['setPageLoading']
  setComponentLoading: UIActions['setComponentLoading']
  updatePreferences: UIActions['updatePreferences']
  updateDashboardLayout: UIActions['updateDashboardLayout']
  addWidget: UIActions['addWidget']
  removeWidget: UIActions['removeWidget']
  updateWidget: UIActions['updateWidget']
  updateTerminalSettings: UIActions['updateTerminalSettings']
  updateChartSettings: UIActions['updateChartSettings']
}

const initialUIState: UIState = {
  theme: 'dark',
  colorScheme: 'orange',
  fontSize: 'medium',
  sidebarCollapsed: false,
  sidebarPinned: true,
  compactMode: false,
  fullscreen: false,
  currentPage: '/',
  breadcrumbs: [],
  notifications: [],
  notificationSettings: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    position: 'top-right',
    autoHide: true,
    hideDelay: 5000,
  },
  modals: [],
  loading: {
    global: false,
    page: false,
    components: {},
  },
  preferences: {
    animations: true,
    reducedMotion: false,
    highContrast: false,
    autoSave: true,
    confirmActions: true,
    showTooltips: true,
  },
  dashboardLayout: {
    widgets: [],
    columns: 12,
    compact: false,
  },
  terminal: {
    fontSize: 14,
    fontFamily: 'Monaco, monospace',
    cursorStyle: 'block',
    theme: 'bloomberg',
    opacity: 0.95,
  },
  charts: {
    defaultTimeframe: '1D',
    candlestickStyle: 'candles',
    indicators: [],
    showVolume: true,
    showGrid: true,
  },
}

export const createUISlice: StateCreator<
  RootState,
  [],
  [],
  UISlice
> = (set, get) => ({
  ui: initialUIState,
  
  setTheme: (theme: UIState['theme']) => {
    set((state) => {
      state.ui.theme = theme
    })
  },
  
  setColorScheme: (scheme: UIState['colorScheme']) => {
    set((state) => {
      state.ui.colorScheme = scheme
    })
  },
  
  setFontSize: (size: UIState['fontSize']) => {
    set((state) => {
      state.ui.fontSize = size
    })
  },
  
  toggleSidebar: () => {
    set((state) => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed
    })
  },
  
  setSidebarCollapsed: (collapsed: boolean) => {
    set((state) => {
      state.ui.sidebarCollapsed = collapsed
    })
  },
  
  toggleSidebarPin: () => {
    set((state) => {
      state.ui.sidebarPinned = !state.ui.sidebarPinned
    })
  },
  
  setCompactMode: (compact: boolean) => {
    set((state) => {
      state.ui.compactMode = compact
    })
  },
  
  toggleFullscreen: () => {
    set((state) => {
      state.ui.fullscreen = !state.ui.fullscreen
    })
  },
  
  setCurrentPage: (page: string) => {
    set((state) => {
      state.ui.currentPage = page
    })
  },
  
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => {
    set((state) => {
      state.ui.breadcrumbs = breadcrumbs
    })
  },
  
  addBreadcrumb: (breadcrumb: UIState['breadcrumbs'][0]) => {
    set((state) => {
      state.ui.breadcrumbs.push(breadcrumb)
    })
  },
  
  addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp' | 'read'>) => {
    set((state) => {
      const newNotification: NotificationState = {
        ...notification,
        id: `notification_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        timestamp: Date.now(),
        read: false,
      }
      
      state.ui.notifications.unshift(newNotification)
      
      // Keep only last 100 notifications
      if (state.ui.notifications.length > 100) {
        state.ui.notifications = state.ui.notifications.slice(0, 100)
      }
    })
  },
  
  removeNotification: (id: string) => {
    set((state) => {
      state.ui.notifications = state.ui.notifications.filter(n => n.id !== id)
    })
  },
  
  markNotificationRead: (id: string) => {
    set((state) => {
      const notification = state.ui.notifications.find(n => n.id === id)
      if (notification) {
        notification.read = true
      }
    })
  },
  
  markAllNotificationsRead: () => {
    set((state) => {
      state.ui.notifications.forEach(notification => {
        notification.read = true
      })
    })
  },
  
  clearNotifications: () => {
    set((state) => {
      state.ui.notifications = []
    })
  },
  
  updateNotificationSettings: (settings: Partial<UIState['notificationSettings']>) => {
    set((state) => {
      state.ui.notificationSettings = { ...state.ui.notificationSettings, ...settings }
    })
  },
  
  openModal: (modal: Omit<ModalState, 'id'>) => {
    set((state) => {
      const newModal: ModalState = {
        ...modal,
        id: `modal_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      }
      
      state.ui.modals.push(newModal)
    })
  },
  
  closeModal: (id: string) => {
    set((state) => {
      state.ui.modals = state.ui.modals.filter(m => m.id !== id)
    })
  },
  
  closeAllModals: () => {
    set((state) => {
      state.ui.modals = []
    })
  },
  
  setGlobalLoading: (loading: boolean) => {
    set((state) => {
      state.ui.loading.global = loading
    })
  },
  
  setPageLoading: (loading: boolean) => {
    set((state) => {
      state.ui.loading.page = loading
    })
  },
  
  setComponentLoading: (component: string, loading: boolean) => {
    set((state) => {
      if (loading) {
        state.ui.loading.components[component] = true
      } else {
        delete state.ui.loading.components[component]
      }
    })
  },
  
  updatePreferences: (preferences: Partial<UIState['preferences']>) => {
    set((state) => {
      state.ui.preferences = { ...state.ui.preferences, ...preferences }
    })
  },
  
  updateDashboardLayout: (layout: Partial<UIState['dashboardLayout']>) => {
    set((state) => {
      state.ui.dashboardLayout = { ...state.ui.dashboardLayout, ...layout }
    })
  },
  
  addWidget: (widget: UIState['dashboardLayout']['widgets'][0]) => {
    set((state) => {
      state.ui.dashboardLayout.widgets.push(widget)
    })
  },
  
  removeWidget: (id: string) => {
    set((state) => {
      state.ui.dashboardLayout.widgets = state.ui.dashboardLayout.widgets.filter(w => w.id !== id)
    })
  },
  
  updateWidget: (id: string, updates: Partial<UIState['dashboardLayout']['widgets'][0]>) => {
    set((state) => {
      const widget = state.ui.dashboardLayout.widgets.find(w => w.id === id)
      if (widget) {
        Object.assign(widget, updates)
      }
    })
  },
  
  updateTerminalSettings: (settings: Partial<UIState['terminal']>) => {
    set((state) => {
      state.ui.terminal = { ...state.ui.terminal, ...settings }
    })
  },
  
  updateChartSettings: (settings: Partial<UIState['charts']>) => {
    set((state) => {
      state.ui.charts = { ...state.ui.charts, ...settings }
    })
  },
})