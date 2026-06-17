import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  quit: () => ipcRenderer.send('window-quit'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),
  getKeyFrequency: (limit: number) => ipcRenderer.invoke('get-key-frequency', limit),
  getDailyStats: (days: number) => ipcRenderer.invoke('get-daily-stats', days),
  getHourlyStats: (date: string) => ipcRenderer.invoke('get-hourly-stats', date),
  getMultiDimDailyStats: (dates: string[]) => ipcRenderer.invoke('get-multi-dim-daily-stats', dates),
  getAvailableDates: () => ipcRenderer.invoke('get-available-dates'),
  onKeyPress: (callback: (key: string, count: number) => void) => {
    const listener = (_: any, key: string, count: number) => callback(key, count)
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
