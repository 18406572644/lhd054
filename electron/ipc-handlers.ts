import { ipcMain, dialog } from 'electron'
import { getTodayStats, getKeyFrequency, getDailyStats, getHourlyStats, clearData } from './database'
import { exportToExcel } from './excel-exporter'

export function registerIpcHandlers() {
  ipcMain.handle('get-today-stats', () => {
    return getTodayStats()
  })

  ipcMain.handle('get-key-frequency', (_: any, limit: number) => {
    return getKeyFrequency(limit)
  })

  ipcMain.handle('get-daily-stats', (_: any, days: number) => {
    return getDailyStats(days)
  })

  ipcMain.handle('get-hourly-stats', (_: any, date: string) => {
    return getHourlyStats(date)
  })

  ipcMain.handle('export-excel', async (_: any, startDate: string, endDate: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出 Excel',
        defaultPath: `键盘统计_${startDate}_${endDate}.xlsx`,
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      await exportToExcel(startDate, endDate, result.filePath)
      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '导出失败' }
    }
  })

  ipcMain.handle('clear-data', () => {
    return clearData()
  })
}
