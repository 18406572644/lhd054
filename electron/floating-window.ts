import { BrowserWindow, screen, ipcMain, Menu, app } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

let floatingWindow: BrowserWindow | null = null
let mainWindowRef: BrowserWindow | null = null

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const MAGNET_DISTANCE = 20

export interface FloatingWindowConfig {
  style: 'bar' | 'ring' | 'panel'
  opacity: number
  scale: number
  position: { x: number; y: number }
}

let config: FloatingWindowConfig = {
  style: 'bar',
  opacity: 0.9,
  scale: 1,
  position: { x: 0, y: 0 }
}

function getWindowSize(style: string, scale: number): { width: number; height: number } {
  const baseSizes: Record<string, { width: number; height: number }> = {
    bar: { width: 280, height: 48 },
    ring: { width: 180, height: 180 },
    panel: { width: 240, height: 160 }
  }
  const base = baseSizes[style] || baseSizes.bar
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale)
  }
}

function getDefaultPosition(): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  const size = getWindowSize(config.style, config.scale)
  return {
    x: screenWidth - size.width - 20,
    y: screenHeight - size.height - 20
  }
}

function applyMagnet(x: number, y: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const size = getWindowSize(config.style, config.scale)

  let newX = x
  let newY = y

  if (Math.abs(x - workArea.x) < MAGNET_DISTANCE) {
    newX = workArea.x
  }
  if (Math.abs(x + size.width - (workArea.x + workArea.width)) < MAGNET_DISTANCE) {
    newX = workArea.x + workArea.width - size.width
  }
  if (Math.abs(y - workArea.y) < MAGNET_DISTANCE) {
    newY = workArea.y
  }
  if (Math.abs(y + size.height - (workArea.y + workArea.height)) < MAGNET_DISTANCE) {
    newY = workArea.y + workArea.height - size.height
  }

  return { x: newX, y: newY }
}

export function createFloatingWindow(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  if (floatingWindow) {
    return floatingWindow
  }

  const size = getWindowSize(config.style, config.scale)
  const position = config.position.x === 0 && config.position.y === 0
    ? getDefaultPosition()
    : config.position

  floatingWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  floatingWindow.setAlwaysOnTop(true, 'screen-saver')
  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.VITE_DEV_SERVER_URL) {
    floatingWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}floating.html`)
  } else {
    floatingWindow.loadFile(join(__dirname, '../dist/floating.html'))
  }

  floatingWindow.on('move', () => {
    if (floatingWindow) {
      const [x, y] = floatingWindow.getPosition()
      config.position = { x, y }
    }
  })

  floatingWindow.on('moved', () => {
    if (floatingWindow) {
      const [x, y] = floatingWindow.getPosition()
      const magnetPos = applyMagnet(x, y)
      if (magnetPos.x !== x || magnetPos.y !== y) {
        floatingWindow.setPosition(magnetPos.x, magnetPos.y)
        config.position = magnetPos
      }
    }
  })

  return floatingWindow
}

export function destroyFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.close()
    floatingWindow = null
  }
}

export function showFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.show()
    floatingWindow.setAlwaysOnTop(true, 'screen-saver')
  }
}

export function hideFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.hide()
  }
}

export function toggleFloatingWindow() {
  if (floatingWindow?.isVisible()) {
    hideFloatingWindow()
  } else {
    showFloatingWindow()
  }
}

export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}

export function updateFloatingStyle(style: 'bar' | 'ring' | 'panel') {
  if (!floatingWindow) return

  config.style = style
  const size = getWindowSize(style, config.scale)
  const [x, y] = floatingWindow.getPosition()
  const magnetPos = applyMagnet(x, y)

  floatingWindow.setSize(size.width, size.height)
  floatingWindow.setPosition(magnetPos.x, magnetPos.y)

  floatingWindow.webContents.send('floating-style-changed', style)
}

export function updateFloatingOpacity(opacity: number) {
  if (!floatingWindow) return

  config.opacity = opacity
  floatingWindow.setOpacity(opacity)
  floatingWindow.webContents.send('floating-opacity-changed', opacity)
}

export function updateFloatingScale(scale: number) {
  if (!floatingWindow) return

  config.scale = scale
  const size = getWindowSize(config.style, scale)
  const [x, y] = floatingWindow.getPosition()
  const magnetPos = applyMagnet(x, y)

  floatingWindow.setSize(size.width, size.height)
  floatingWindow.setPosition(magnetPos.x, magnetPos.y)

  floatingWindow.webContents.send('floating-scale-changed', scale)
}

export function sendFloatingStats(data: {
  total: number
  speed: number
  appName: string
}) {
  if (floatingWindow && !floatingWindow.webContents.isDestroyed()) {
    floatingWindow.webContents.send('floating-stats', data)
  }
}

function showContextMenu() {
  if (!floatingWindow) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindowRef?.show()
        mainWindowRef?.focus()
      }
    },
    {
      type: 'separator'
    },
    {
      label: '样式',
      submenu: [
        {
          label: '迷你条',
          type: 'radio',
          checked: config.style === 'bar',
          click: () => updateFloatingStyle('bar')
        },
        {
          label: '环形图',
          type: 'radio',
          checked: config.style === 'ring',
          click: () => updateFloatingStyle('ring')
        },
        {
          label: '数字面板',
          type: 'radio',
          checked: config.style === 'panel',
          click: () => updateFloatingStyle('panel')
        }
      ]
    },
    {
      label: '透明度',
      submenu: [
        { label: '100%', type: 'radio', checked: config.opacity === 1, click: () => updateFloatingOpacity(1) },
        { label: '90%', type: 'radio', checked: config.opacity === 0.9, click: () => updateFloatingOpacity(0.9) },
        { label: '80%', type: 'radio', checked: config.opacity === 0.8, click: () => updateFloatingOpacity(0.8) },
        { label: '70%', type: 'radio', checked: config.opacity === 0.7, click: () => updateFloatingOpacity(0.7) },
        { label: '60%', type: 'radio', checked: config.opacity === 0.6, click: () => updateFloatingOpacity(0.6) },
        { label: '50%', type: 'radio', checked: config.opacity === 0.5, click: () => updateFloatingOpacity(0.5) }
      ]
    },
    {
      label: '大小',
      submenu: [
        { label: '小', type: 'radio', checked: config.scale === 0.8, click: () => updateFloatingScale(0.8) },
        { label: '中', type: 'radio', checked: config.scale === 1, click: () => updateFloatingScale(1) },
        { label: '大', type: 'radio', checked: config.scale === 1.2, click: () => updateFloatingScale(1.2) },
        { label: '特大', type: 'radio', checked: config.scale === 1.5, click: () => updateFloatingScale(1.5) }
      ]
    },
    {
      type: 'separator'
    },
    {
      label: '隐藏悬浮窗',
      click: () => hideFloatingWindow()
    },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  contextMenu.popup({ window: floatingWindow })
}

let isDragging = false
let dragOffset = { x: 0, y: 0 }

export function registerFloatingIpcHandlers() {
  ipcMain.handle('floating-show-main', () => {
    mainWindowRef?.show()
    mainWindowRef?.focus()
  })

  ipcMain.handle('floating-context-menu', () => {
    showContextMenu()
  })

  ipcMain.handle('floating-get-config', () => {
    return config
  })

  ipcMain.handle('floating-set-style', (_: any, style: 'bar' | 'ring' | 'panel') => {
    updateFloatingStyle(style)
  })

  ipcMain.handle('floating-set-opacity', (_: any, opacity: number) => {
    updateFloatingOpacity(opacity)
  })

  ipcMain.handle('floating-set-scale', (_: any, scale: number) => {
    updateFloatingScale(scale)
  })

  ipcMain.on('floating-drag-start', (_, offsetX: number, offsetY: number) => {
    if (!floatingWindow) return
    isDragging = true
    dragOffset = { x: offsetX, y: offsetY }
  })

  ipcMain.on('floating-drag-move', (_, screenX: number, screenY: number) => {
    if (!floatingWindow || !isDragging) return
    const x = Math.round(screenX - dragOffset.x)
    const y = Math.round(screenY - dragOffset.y)
    floatingWindow.setPosition(x, y)
    config.position = { x, y }
  })

  ipcMain.on('floating-drag-end', () => {
    if (!floatingWindow || !isDragging) return
    isDragging = false
    const [x, y] = floatingWindow.getPosition()
    const magnetPos = applyMagnet(x, y)
    if (magnetPos.x !== x || magnetPos.y !== y) {
      floatingWindow.setPosition(magnetPos.x, magnetPos.y)
      config.position = magnetPos
    }
  })
}

export function getFloatingConfig(): FloatingWindowConfig {
  return { ...config }
}
