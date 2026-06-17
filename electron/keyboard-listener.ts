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

function normalizeKeyName(key: string, keyCode: number): string {
  if (keyCodeMap[keyCode]) {
    return keyCodeMap[keyCode]
  }
  if (key.length === 1) {
    return key.toUpperCase()
  }
  const specialKeys: Record<string, string> = {
    ' ': 'Space',
    'Escape': 'Esc',
    'Delete': 'Delete',
    'Insert': 'Insert',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'Enter': 'Enter',
    'Shift': 'Shift',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': 'Win',
    'CapsLock': 'CapsLock',
    'NumLock': 'NumLock',
    'ScrollLock': 'ScrollLock',
    'Pause': 'Pause',
    'ContextMenu': 'Menu'
  }
  return specialKeys[key] || key
}

export function getKeyName(keyCode: number): string {
  return keyCodeMap[keyCode] || `Key${keyCode}`
}

let isListening = false

export function startKeyboardListener(mainWindow: BrowserWindow) {
  if (isListening) return
  
  function handleKeyPress(input: Electron.Input) {
    if (input.type !== 'keyDown') return
    
    let keyCode: number
    if (input.key && input.key.length === 1) {
      keyCode = input.key.toUpperCase().charCodeAt(0)
    } else {
      keyCode = input.code ? input.code.charCodeAt(0) || 0 : input.key?.charCodeAt(0) || 0
    }
    
    const keyName = normalizeKeyName(input.key || '', keyCode)
    recordKeyPress(keyCode, keyName)
    
    const stats = getTodayStats()
    BrowserWindow.getAllWindows().forEach(w => {
      if (w.webContents && !w.webContents.isDestroyed()) {
        w.webContents.send('key-press', keyName, stats.total)
      }
    })
  }
  
  mainWindow.webContents.on('before-input-event', (_, input) => {
    handleKeyPress(input)
  })
  
  isListening = true
  console.log('Keyboard listener started')
}

export function stopKeyboardListener() {
  globalShortcut.unregisterAll()
  isListening = false
}
