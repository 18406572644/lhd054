/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

export interface DayMultiDimData {
  date: string
  totalCount: number
  hourlyData: Array<{ hour: number; count: number }>
  peakHour: number
  letterCount: number
  letterRatio: number
  modifierCount: number
  modifierRatio: number
  backspaceCount: number
  backspaceRatio: number
}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      quit: () => void
      isMaximized: () => Promise<boolean>
      getTodayStats: (appName?: string) => Promise<{ total: number; date: string }>
      getKeyFrequency: (limit: number, appName?: string) => Promise<Array<{ key: string; count: number; percentage: number }>>
      getDailyStats: (days: number, appName?: string) => Promise<Array<{ date: string; count: number }>>
      getHourlyStats: (date: string, appName?: string) => Promise<Array<{ hour: number; count: number }>>
      getMultiDimDailyStats: (dates: string[], appName?: string) => Promise<DayMultiDimData[]>
      getAvailableDates: () => Promise<string[]>
      getAvailableApps: () => Promise<Array<{ app_name: string; total_count: number }>>
      getAppStats: (limit?: number) => Promise<Array<{ appName: string; count: number; percentage: number }>>
      getAppKeyFrequency: (appName: string, limit?: number) => Promise<Array<{ key: string; count: number; percentage: number }>>
      onKeyPress: (callback: (key: string, count: number, appName?: string) => void) => () => void
      exportExcel: (startDate: string, endDate: string) => Promise<{ success: boolean; path?: string; error?: string }>
      saveReportImage: (dataUrl: string, defaultName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      clearData: () => Promise<boolean>
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string }>
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>
      installUpdate: () => Promise<{ success: boolean }>
      onUpdaterMessage: (callback: (message: { status: string; data?: any }) => void) => () => void

      floatingShowMain: () => Promise<void>
      floatingContextMenu: () => Promise<void>
      floatingGetConfig: () => Promise<{
        style: 'bar' | 'ring' | 'panel'
        opacity: number
        scale: number
        position: { x: number; y: number }
      }>
      floatingSetStyle: (style: 'bar' | 'ring' | 'panel') => Promise<void>
      floatingSetOpacity: (opacity: number) => Promise<void>
      floatingSetScale: (scale: number) => Promise<void>
      floatingDragStart: (offsetX: number, offsetY: number) => void
      floatingDragMove: (screenX: number, screenY: number) => void
      floatingDragEnd: () => void
      onFloatingStats: (callback: (data: { total: number; speed: number; appName: string }) => void) => () => void
      onFloatingStyleChanged: (callback: (style: string) => void) => () => void
      onFloatingOpacityChanged: (callback: (opacity: number) => void) => () => void
      onFloatingScaleChanged: (callback: (scale: number) => void) => () => void
    }
  }
}

export {}
