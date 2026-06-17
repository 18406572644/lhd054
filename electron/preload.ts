import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  quit: () => ipcRenderer.send('window-quit'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  getTodayStats: (appName?: string) => ipcRenderer.invoke('get-today-stats', appName),
  getKeyFrequency: (limit: number, appName?: string) => ipcRenderer.invoke('get-key-frequency', limit, appName),
  getDailyStats: (days: number, appName?: string) => ipcRenderer.invoke('get-daily-stats', days, appName),
  getHourlyStats: (date: string, appName?: string) => ipcRenderer.invoke('get-hourly-stats', date, appName),
  getMultiDimDailyStats: (dates: string[], appName?: string) => ipcRenderer.invoke('get-multi-dim-daily-stats', dates, appName),
  getAvailableDates: () => ipcRenderer.invoke('get-available-dates'),
  getAvailableApps: () => ipcRenderer.invoke('get-available-apps'),
  getAppStats: (limit: number) => ipcRenderer.invoke('get-app-stats', limit),
  getAppKeyFrequency: (appName: string, limit: number) => ipcRenderer.invoke('get-app-key-frequency', appName, limit),
  
  onKeyPress: (callback: (key: string, count: number, appName?: string) => void) => {
    const listener = (_: any, key: string, count: number, appName?: string) => callback(key, count, appName)
    ipcRenderer.on('key-press', listener)
    return () => ipcRenderer.removeListener('key-press', listener)
  },
  
  exportExcel: (startDate: string, endDate: string) => 
    ipcRenderer.invoke('export-excel', startDate, endDate),
  saveReportImage: (dataUrl: string, defaultName: string) =>
    ipcRenderer.invoke('save-report-image', dataUrl, defaultName),
  clearData: () => ipcRenderer.invoke('clear-data'),

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdaterMessage: (callback: (message: { status: string; data?: any }) => void) => {
    const listener = (_: any, message: { status: string; data?: any }) => callback(message)
    ipcRenderer.on('updater-message', listener)
    return () => ipcRenderer.removeListener('updater-message', listener)
  },

  floatingShowMain: () => ipcRenderer.invoke('floating-show-main'),
  floatingContextMenu: () => ipcRenderer.invoke('floating-context-menu'),
  floatingGetConfig: () => ipcRenderer.invoke('floating-get-config'),
  floatingSetStyle: (style: 'bar' | 'ring' | 'panel') => ipcRenderer.invoke('floating-set-style', style),
  floatingSetOpacity: (opacity: number) => ipcRenderer.invoke('floating-set-opacity', opacity),
  floatingSetScale: (scale: number) => ipcRenderer.invoke('floating-set-scale', scale),
  floatingDragStart: (offsetX: number, offsetY: number) => ipcRenderer.send('floating-drag-start', offsetX, offsetY),
  floatingDragMove: (screenX: number, screenY: number) => ipcRenderer.send('floating-drag-move', screenX, screenY),
  floatingDragEnd: () => ipcRenderer.send('floating-drag-end'),

  onFloatingStats: (callback: (data: { total: number; speed: number; appName: string }) => void) => {
    const listener = (_: any, data: { total: number; speed: number; appName: string }) => callback(data)
    ipcRenderer.on('floating-stats', listener)
    return () => ipcRenderer.removeListener('floating-stats', listener)
  },

  onFloatingStyleChanged: (callback: (style: string) => void) => {
    const listener = (_: any, style: string) => callback(style)
    ipcRenderer.on('floating-style-changed', listener)
    return () => ipcRenderer.removeListener('floating-style-changed', listener)
  },

  onFloatingOpacityChanged: (callback: (opacity: number) => void) => {
    const listener = (_: any, opacity: number) => callback(opacity)
    ipcRenderer.on('floating-opacity-changed', listener)
    return () => ipcRenderer.removeListener('floating-opacity-changed', listener)
  },

  onFloatingScaleChanged: (callback: (scale: number) => void) => {
    const listener = (_: any, scale: number) => callback(scale)
    ipcRenderer.on('floating-scale-changed', listener)
    return () => ipcRenderer.removeListener('floating-scale-changed', listener)
  }
})
