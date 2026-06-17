import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './database'
import { startKeyboardListener, stopKeyboardListener } from './keyboard-listener'
import { registerIpcHandlers } from './ipc-handlers'
import { initAutoUpdater, registerUpdaterIpcHandlers } from './auto-updater'
import { startActiveWindowMonitor, stopActiveWindowMonitor } from './active-window-monitor'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    transparent: true,
    backgroundColor: '#0a0e17',
    icon: join(process.env.VITE_DEV_SERVER_URL ? process.cwd() : process.resourcesPath, 'build/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function createTray() {
  const iconPath = join(process.env.VITE_DEV_SERVER_URL ? process.cwd() : process.resourcesPath, 'build/icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  
  tray = new Tray(trayIcon)
  tray.setToolTip('键盘按键统计')
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show()
      }
    },
    {
      type: 'separator'
    },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        stopKeyboardListener()
        stopActiveWindowMonitor()
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
    }
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  registerUpdaterIpcHandlers()
  createWindow()
  createTray()
  startActiveWindowMonitor(1000)
  if (mainWindow) {
    startKeyboardListener(mainWindow)
    initAutoUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopKeyboardListener()
  stopActiveWindowMonitor()
})

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.hide()
})

ipcMain.on('window-quit', () => {
  isQuitting = true
  stopKeyboardListener()
  stopActiveWindowMonitor()
  app.quit()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})
