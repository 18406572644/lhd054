import { BrowserWindow } from 'electron'
import { uIOhook } from 'uiohook-napi'
import { recordKeyPress, getTodayStats } from './database'
import { getCurrentActiveWindow, forceRefreshActiveWindow } from './active-window-monitor'
import { sendFloatingStats } from './floating-window'

const UIHOOK_TO_VK: Record<number, number> = {
  1: 27, 2: 49, 3: 50, 4: 51, 5: 52, 6: 53, 7: 54, 8: 55, 9: 56, 10: 57,
  11: 48, 12: 189, 13: 187, 14: 8, 15: 9, 16: 81, 17: 87, 18: 69, 19: 82,
  20: 84, 21: 89, 22: 85, 23: 73, 24: 79, 25: 80, 26: 219, 27: 221, 28: 13,
  29: 17, 30: 65, 31: 83, 32: 68, 33: 70, 34: 71, 35: 72, 36: 74, 37: 75,
  38: 76, 39: 186, 40: 222, 41: 192, 42: 16, 43: 220, 44: 90, 45: 88, 46: 67,
  47: 86, 48: 66, 49: 78, 50: 77, 51: 188, 52: 190, 53: 191, 54: 16, 56: 18,
  57: 32, 58: 20, 59: 112, 60: 113, 61: 114, 62: 115, 63: 116, 64: 117, 65: 118,
  66: 119, 67: 120, 68: 121, 69: 122, 70: 123, 71: 145, 72: 19, 73: 36, 74: 33,
  75: 34, 76: 35, 77: 37, 78: 38, 79: 39, 80: 40, 81: 45, 82: 46, 83: 144,
  84: 111, 85: 106, 86: 109, 87: 107, 88: 13, 89: 97, 90: 98, 91: 99, 92: 100,
  93: 101, 94: 102, 95: 103, 96: 104, 97: 105, 98: 110, 99: 46, 100: 111,
  119: 91, 125: 93, 127: 19, 155: 44, 183: 110, 3660: 18, 3662: 17,
  3613: 17, 3639: 18, 3652: 91, 3653: 92, 3654: 93, 3655: 91,
  3656: 92, 3657: 93, 3666: 18, 3667: 17, 3675: 17, 3676: 16, 3677: 18,
  3640: 16, 3638: 16, 3612: 17
}

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

const NUMPAD_ENTER_UIOHOOK = 88

function uiohookKeycodeToVk(uiohookKeycode: number): number {
  return UIHOOK_TO_VK[uiohookKeycode] || uiohookKeycode
}

function normalizeKeyName(vkCode: number, uiohookKeycode?: number): string {
  if (uiohookKeycode === NUMPAD_ENTER_UIOHOOK) {
    return 'NumEnter'
  }

  if (keyCodeMap[vkCode]) {
    return keyCodeMap[vkCode]
  }

  if (vkCode >= 65 && vkCode <= 90) {
    return String.fromCharCode(vkCode)
  }

  if (vkCode >= 48 && vkCode <= 57) {
    return String.fromCharCode(vkCode)
  }

  return `Key${vkCode}`
}

export function getKeyName(keyCode: number): string {
  return keyCodeMap[keyCode] || `Key${keyCode}`
}

let isListening = false
let mainWindowRef: BrowserWindow | null = null

const keyTimestamps: number[] = []
const SPEED_WINDOW_MS = 60000

function calculateKpm(): number {
  const now = Date.now()
  const windowStart = now - SPEED_WINDOW_MS
  
  while (keyTimestamps.length > 0 && keyTimestamps[0] < windowStart) {
    keyTimestamps.shift()
  }
  
  return keyTimestamps.length
}

function recordKeyTimestamp() {
  keyTimestamps.push(Date.now())
  
  if (keyTimestamps.length > 5000) {
    keyTimestamps.shift()
  }
}

function handleGlobalKeyPress(event: { keycode: number; altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) {
  try {
    const vkCode = uiohookKeycodeToVk(event.keycode)
    const keyName = normalizeKeyName(vkCode, event.keycode)

    const activeWindow = getCurrentActiveWindow()
    const appName = activeWindow.appName || '未知应用'

    console.log(`[KeyPress] key=${keyName} (vk=${vkCode}, uiohook=${event.keycode}) app=${appName} window=${activeWindow.windowTitle}`)

    recordKeyPress(vkCode, keyName, appName)
    recordKeyTimestamp()

    const stats = getTodayStats()
    const speed = calculateKpm()

    BrowserWindow.getAllWindows().forEach(w => {
      if (w.webContents && !w.webContents.isDestroyed()) {
        w.webContents.send('key-press', keyName, stats.total, appName)
      }
    })

    sendFloatingStats({
      total: stats.total,
      speed,
      appName
    })

    setImmediate(() => {
      forceRefreshActiveWindow().catch(() => {})
    })
  } catch (err) {
    console.error('[KeyPress] Error handling key:', err)
  }
}

export function startKeyboardListener(mainWindow: BrowserWindow) {
  if (isListening) return

  mainWindowRef = mainWindow

  try {
    uIOhook.on('keydown', handleGlobalKeyPress)
    uIOhook.start()

    isListening = true
    console.log('[Keyboard] Global keyboard listener started using uiohook-napi')
  } catch (err) {
    console.error('[Keyboard] Failed to start global keyboard listener:', err)
    throw err
  }
}

export function stopKeyboardListener() {
  if (!isListening) return

  try {
    uIOhook.off('keydown', handleGlobalKeyPress)
    uIOhook.stop()
  } catch (err) {
    console.error('[Keyboard] Error stopping listener:', err)
  }

  mainWindowRef = null
  isListening = false
  console.log('[Keyboard] Global keyboard listener stopped')
}
