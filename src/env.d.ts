/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

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
    getAppVersion: () => Promise<string>
    checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string }>
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>
    installUpdate: () => Promise<{ success: boolean }>
    onUpdaterMessage: (callback: (message: { status: string; data?: any }) => void) => () => void
  }
}
