import { ipcMain, dialog } from 'electron'
import { getTodayStats, getKeyFrequency, getDailyStats, getHourlyStats, clearData, getMultiDimDailyStats, getAvailableDates } from './database'
import { exportToExcel } from './excel-exporter'
import * as fs from 'fs'

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

  ipcMain.handle('get-multi-dim-daily-stats', (_: any, dates: string[]) => {
    return getMultiDimDailyStats(dates)
  })

  ipcMain.handle('get-available-dates', () => {
    return getAvailableDates()
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

  ipcMain.handle('save-report-image', async (_: any, dataUrl: string, defaultName: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '保存对比报告',
        defaultPath: defaultName,
        filters: [
          { name: 'PNG 图片', extensions: ['png'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
      fs.writeFileSync(result.filePath, base64Data, 'base64')
      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '保存失败' }
    }
  })

  ipcMain.handle('clear-data', () => {
    return clearData()
  })
}
