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
  }
})
