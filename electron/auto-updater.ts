import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

let mainWindow: BrowserWindow | null = null

function sendStatusToWindow(status: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-message', { status, data })
  }
}

export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('[AutoUpdater] 开发模式跳过自动更新检查')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', { message: err.message })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('downloading', {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info)
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] 检查更新失败:', err.message)
    })
  }, 3000)
}

export function registerUpdaterIpcHandlers() {
  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdates()
      .then((result) => ({ success: true, result }))
      .catch((err) => ({ success: false, error: err.message }))
  })

  ipcMain.handle('download-update', () => {
    return autoUpdater.downloadUpdate()
      .then(() => ({ success: true }))
      .catch((err) => ({ success: false, error: err.message }))
  })

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}
