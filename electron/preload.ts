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
  onKeyPress: (callback: (key: string, count: number) => void) => {
    const listener = (_: any, key: string, count: number) => callback(key, count)
    ipcRenderer.on('key-press', listener)
    return () => ipcRenderer.removeListener('key-press', listener)
  },
  exportExcel: (startDate: string, endDate: string) => 
    ipcRenderer.invoke('export-excel', startDate, endDate),
  clearData: () => ipcRenderer.invoke('clear-data')
})

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      quit: () => void
      isMaximized: () => Promise<boolean>
      getTodayStats: () => Promise<{ total: number; date: string }>
      getKeyFrequency: (limit: number) => Promise<Array<{ key: string; count: number; percentage: number }>>
      getDailyStats: (days: number) => Promise<Array<{ date: string; count: number }>>
      getHourlyStats: (date: string) => Promise<Array<{ hour: number; count: number }>>
      onKeyPress: (callback: (key: string, count: number) => void) => () => void
      exportExcel: (startDate: string, endDate: string) => Promise<{ success: boolean; path?: string; error?: string }>
      clearData: () => Promise<boolean>
    }
  }
}
