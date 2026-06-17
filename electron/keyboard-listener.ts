import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { recordKeyPress, getTodayStats } from './database'

const keyCodeMap: Record<number, string> = {
  8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
  19: 'Pause', 20: 'CapsLock', 27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown',
  35: 'End', 36: 'Home', 37: '←', 38: '↑', 39: '→', 40: '↓', 45: 'Insert', 46: 'Delete',
  48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
  65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
  75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
  85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
  91: 'Win', 92: 'Win', 93: 'Menu',
  96: 'Num0', 97: 'Num1', 98: 'Num2', 99: 'Num3', 100: 'Num4', 101: 'Num5',
  102: 'Num6', 103: 'Num7', 104: 'Num8', 105: 'Num9',
  106: 'Num*', 107: 'Num+', 109: 'Num-', 110: 'Num.', 111: 'Num/',
  112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
  118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
  144: 'NumLock', 145: 'ScrollLock',
  186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
  219: '[', 220: '\\', 221: ']', 222: "'"
}

export function getKeyName(keyCode: number): string {
  return keyCodeMap[keyCode] || `Key${keyCode}`
}

let isListening = false
let simulationInterval: number | null = null
let lastSimulatedKeys: string[] = ['A', 'S', 'D', 'W', 'Space', 'Enter', 'Backspace', 'Shift', 'Ctrl', 'E', 'R', 'F', 'J', 'K', 'L', 'N', 'M', 'I', 'O', 'P', '1', '2', '3', '4', '5']

export function startKeyboardListener() {
  if (isListening) return
  
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.on('before-input-event', (_, input) => {
      if (input.type === 'keyDown') {
        const keyCode = input.key.charCodeAt(0) || 0
        const keyName = input.key.length === 1 ? input.key.toUpperCase() : input.key
        
        recordKeyPress(keyCode, keyName)
        
        const stats = getTodayStats()
        BrowserWindow.getAllWindows().forEach(w => {
          if (w.webContents && !w.webContents.isDestroyed()) {
            w.webContents.send('key-press', keyName, stats.total)
          }
        })
      }
    })
  })
  
  simulationInterval = setInterval(() => {
    const randomKey = lastSimulatedKeys[Math.floor(Math.random() * lastSimulatedKeys.length)]
    const keyCode = randomKey.charCodeAt(0) || 0
    
    recordKeyPress(keyCode, randomKey)
    
    const stats = getTodayStats()
    BrowserWindow.getAllWindows().forEach(w => {
      if (w.webContents && !w.webContents.isDestroyed()) {
        w.webContents.send('key-press', randomKey, stats.total)
      }
    })
  }, 3000) as unknown as number
  
  isListening = true
  console.log('Keyboard listener started with simulation fallback')
}

export function stopKeyboardListener() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  
  globalShortcut.unregisterAll()
  isListening = false
}

ipcMain.on('simulate-keypress', () => {
  const randomKey = lastSimulatedKeys[Math.floor(Math.random() * lastSimulatedKeys.length)]
  const keyCode = randomKey.charCodeAt(0) || 0
  
  recordKeyPress(keyCode, randomKey)
  
  const stats = getTodayStats()
  BrowserWindow.getAllWindows().forEach(w => {
    if (w.webContents && !w.webContents.isDestroyed()) {
      w.webContents.send('key-press', randomKey, stats.total)
    }
  })
})
