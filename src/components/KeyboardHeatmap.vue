<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, Ref } from 'vue'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

type KeyData = { key: string; count: number; percentage: number }
type KeyboardKey = {
  code: string
  label: string
  displayLabel?: string
  colStart: number
  colSpan: number
  rowStart: number
  rowSpan: number
  section: 'function' | 'main' | 'edit' | 'numpad' | 'spacer'
}

const GRID = 4
const TOTAL_COLS = 24 * GRID
const TOTAL_ROWS = 6
const GAP = 6

const allKeyData = ref<KeyData[]>([])
const loading = ref(true)
const viewMode = ref<'full' | 'main' | 'numpad' | 'edit'>('full')
const tooltip = ref<{ visible: boolean; x: number; y: number; key: KeyboardKey | null; data: KeyData | null }>({
  visible: false, x: 0, y: 0, key: null, data: null
})

const COLOR_LEVELS = 6

const keyCodeAliases: Record<string, string[]> = {
  'Shift': ['Shift', 'Shift_R'],
  'Ctrl': ['Ctrl', 'Ctrl_R'],
  'Alt': ['Alt', 'Alt_R'],
  'Win': ['Win', 'Win_R']
}

const u = (units: number) => Math.round(units * GRID)

const keyboardLayout: KeyboardKey[] = [
  // ================ Row 0: Function keys ================
  { code: 'Esc',        label: 'Esc',     colStart: u(0),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F1',         label: 'F1',      colStart: u(2),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F2',         label: 'F2',      colStart: u(3),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F3',         label: 'F3',      colStart: u(4),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F4',         label: 'F4',      colStart: u(5),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F5',         label: 'F5',      colStart: u(7),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F6',         label: 'F6',      colStart: u(8),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F7',         label: 'F7',      colStart: u(9),    colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F8',         label: 'F8',      colStart: u(10),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F9',         label: 'F9',      colStart: u(12),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F10',        label: 'F10',     colStart: u(13),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F11',        label: 'F11',     colStart: u(14),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },
  { code: 'F12',        label: 'F12',     colStart: u(15),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'function' },

  { code: 'PrintScreen',label: 'PrtSc',   colStart: u(17),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'edit' },
  { code: 'ScrollLock', label: 'ScrLk',   colStart: u(18),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'edit' },
  { code: 'Pause',      label: 'Pause',   colStart: u(19),   colSpan: u(1), rowStart: 0, rowSpan: 1, section: 'edit' },

  // ================ Row 1: Number row ================
  { code: '`',          label: '` ~',     colStart: u(0),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '1',          label: '1 !',     colStart: u(1),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '2',          label: '2 @',     colStart: u(2),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '3',          label: '3 #',     colStart: u(3),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '4',          label: '4 $',     colStart: u(4),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '5',          label: '5 %',     colStart: u(5),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '6',          label: '6 ^',     colStart: u(6),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '7',          label: '7 &',     colStart: u(7),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '8',          label: '8 *',     colStart: u(8),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '9',          label: '9 (',     colStart: u(9),    colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '0',          label: '0 )',     colStart: u(10),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '-',          label: '- _',     colStart: u(11),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: '=',          label: '= +',     colStart: u(12),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'main' },
  { code: 'Backspace',  label: 'Backspace', colStart: u(13), colSpan: u(2), rowStart: 1, rowSpan: 1, section: 'main' },

  { code: 'Insert',     label: 'Ins',     colStart: u(17),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'edit' },
  { code: 'Home',       label: 'Home',    colStart: u(18),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'edit' },
  { code: 'PageUp',     label: 'PgUp',    colStart: u(19),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'edit' },

  { code: 'NumLock',    label: 'Num',     colStart: u(21),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'numpad' },
  { code: 'Num/',       label: '/',       colStart: u(22),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'numpad' },
  { code: 'Num*',       label: '*',       colStart: u(23),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'numpad' },
  { code: 'Num-',       label: '−',       colStart: u(24),   colSpan: u(1), rowStart: 1, rowSpan: 1, section: 'numpad' },

  // ================ Row 2: QWERTY row (top letters) ================
  { code: 'Tab',        label: 'Tab',     colStart: u(0),    colSpan: u(1.5), rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'Q',          label: 'Q',       colStart: u(1.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'W',          label: 'W',       colStart: u(2.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'E',          label: 'E',       colStart: u(3.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'R',          label: 'R',       colStart: u(4.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'T',          label: 'T',       colStart: u(5.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'Y',          label: 'Y',       colStart: u(6.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'U',          label: 'U',       colStart: u(7.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'I',          label: 'I',       colStart: u(8.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'O',          label: 'O',       colStart: u(9.5),  colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: 'P',          label: 'P',       colStart: u(10.5), colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: '[',          label: '[ {',     colStart: u(11.5), colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: ']',          label: '] }',     colStart: u(12.5), colSpan: u(1),   rowStart: 2, rowSpan: 1, section: 'main' },
  { code: '\\',         label: '\\ |',    colStart: u(13.5), colSpan: u(1.5), rowStart: 2, rowSpan: 1, section: 'main' },

  { code: 'Delete',     label: 'Del',     colStart: u(17),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'edit' },
  { code: 'End',        label: 'End',     colStart: u(18),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'edit' },
  { code: 'PageDown',   label: 'PgDn',    colStart: u(19),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'edit' },

  { code: 'Num7',       label: '7',       colStart: u(21),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'numpad' },
  { code: 'Num8',       label: '8',       colStart: u(22),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'numpad' },
  { code: 'Num9',       label: '9',       colStart: u(23),   colSpan: u(1), rowStart: 2, rowSpan: 1, section: 'numpad' },
  { code: 'Num+',       label: '+',       colStart: u(24),   colSpan: u(1), rowStart: 2, rowSpan: 2, section: 'numpad' },

  // ================ Row 3: ASDF row ================
  { code: 'CapsLock',   label: 'Caps',    colStart: u(0),    colSpan: u(1.75), rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'A',          label: 'A',       colStart: u(1.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'S',          label: 'S',       colStart: u(2.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'D',          label: 'D',       colStart: u(3.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'F',          label: 'F',       colStart: u(4.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'G',          label: 'G',       colStart: u(5.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'H',          label: 'H',       colStart: u(6.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'J',          label: 'J',       colStart: u(7.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'K',          label: 'K',       colStart: u(8.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'L',          label: 'L',       colStart: u(9.75), colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: ';',          label: '; :',     colStart: u(10.75),colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: "'",          label: '\' "',    colStart: u(11.75),colSpan: u(1),    rowStart: 3, rowSpan: 1, section: 'main' },
  { code: 'Enter',      label: 'Enter',   colStart: u(12.75),colSpan: u(2.25), rowStart: 3, rowSpan: 1, section: 'main' },

  { code: 'Num4',       label: '4',       colStart: u(21),   colSpan: u(1), rowStart: 3, rowSpan: 1, section: 'numpad' },
  { code: 'Num5',       label: '5',       colStart: u(22),   colSpan: u(1), rowStart: 3, rowSpan: 1, section: 'numpad' },
  { code: 'Num6',       label: '6',       colStart: u(23),   colSpan: u(1), rowStart: 3, rowSpan: 1, section: 'numpad' },

  // ================ Row 4: ZXCV row ================
  { code: 'Shift',      label: 'Shift',   colStart: u(0),    colSpan: u(2.25), rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'Z',          label: 'Z',       colStart: u(2.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'X',          label: 'X',       colStart: u(3.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'C',          label: 'C',       colStart: u(4.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'V',          label: 'V',       colStart: u(5.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'B',          label: 'B',       colStart: u(6.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'N',          label: 'N',       colStart: u(7.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'M',          label: 'M',       colStart: u(8.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: ',',          label: ', <',     colStart: u(9.25), colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: '.',          label: '. >',     colStart: u(10.25),colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: '/',          label: '/ ?',     colStart: u(11.25),colSpan: u(1),    rowStart: 4, rowSpan: 1, section: 'main' },
  { code: 'Shift_R',    label: 'Shift',   colStart: u(12.25),colSpan: u(2.75), rowStart: 4, rowSpan: 1, section: 'main' },

  { code: '↑',          label: '↑',       colStart: u(18),   colSpan: u(1), rowStart: 4, rowSpan: 1, section: 'edit' },

  { code: 'Num1',       label: '1',       colStart: u(21),   colSpan: u(1), rowStart: 4, rowSpan: 1, section: 'numpad' },
  { code: 'Num2',       label: '2',       colStart: u(22),   colSpan: u(1), rowStart: 4, rowSpan: 1, section: 'numpad' },
  { code: 'Num3',       label: '3',       colStart: u(23),   colSpan: u(1), rowStart: 4, rowSpan: 1, section: 'numpad' },
  { code: 'NumEnter',   label: 'Enter',   colStart: u(24),   colSpan: u(1), rowStart: 4, rowSpan: 2, section: 'numpad' },

  // ================ Row 5: Bottom row ================
  { code: 'Ctrl',       label: 'Ctrl',    colStart: u(0),     colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Win',        label: 'Win',     colStart: u(1.25),  colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Alt',        label: 'Alt',     colStart: u(2.5),   colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Space',      label: 'Space',   colStart: u(3.75),  colSpan: u(6.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Alt_R',      label: 'Alt',     colStart: u(10),    colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Win_R',      label: 'Win',     colStart: u(11.25), colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Menu',       label: 'Menu',    colStart: u(12.5),  colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },
  { code: 'Ctrl_R',     label: 'Ctrl',    colStart: u(13.75), colSpan: u(1.25), rowStart: 5, rowSpan: 1, section: 'main' },

  { code: '←',          label: '←',       colStart: u(17),   colSpan: u(1), rowStart: 5, rowSpan: 1, section: 'edit' },
  { code: '↓',          label: '↓',       colStart: u(18),   colSpan: u(1), rowStart: 5, rowSpan: 1, section: 'edit' },
  { code: '→',          label: '→',       colStart: u(19),   colSpan: u(1), rowStart: 5, rowSpan: 1, section: 'edit' },

  { code: 'Num0',       label: '0',       colStart: u(21),   colSpan: u(2), rowStart: 5, rowSpan: 1, section: 'numpad' },
  { code: 'Num.',       label: '.',       colStart: u(23),   colSpan: u(1), rowStart: 5, rowSpan: 1, section: 'numpad' }
]

onMounted(() => { loadData() })
watch(() => refreshTrigger?.value, () => { loadData() })
watch(selectedAppFilter, () => { loadData() })

async function loadData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const appName = selectedAppFilter.value !== 'all' ? selectedAppFilter.value : undefined
    const data = await window.electronAPI.getKeyFrequency(500, appName)
    allKeyData.value = data
  } finally {
    loading.value = false
  }
}

function resolveKeyCode(code: string): string[] {
  if (keyCodeAliases[code]) return keyCodeAliases[code]
  return [code]
}

const aggregatedMap = computed(() => {
  const result = new Map<string, { count: number; percentage: number }>()
  allKeyData.value.forEach(d => {
    const resolved = resolveKeyCode(d.key)
    resolved.forEach(code => {
      const existing = result.get(code)
      if (existing) {
        existing.count += d.count
        existing.percentage += d.percentage
      } else {
        result.set(code, { count: d.count, percentage: d.percentage })
      }
    })
  })
  return result
})

const keyDataMap = computed(() => {
  const map = new Map<string, KeyData>()
  aggregatedMap.value.forEach((value, key) => {
    map.set(key, { key, count: value.count, percentage: Math.round(value.percentage * 100) / 100 })
  })
  return map
})

const totalCount = computed(() => allKeyData.value.reduce((sum, k) => sum + k.count, 0))

const maxCount = computed(() => {
  if (aggregatedMap.value.size === 0) return 1
  let max = 1
  aggregatedMap.value.forEach(v => { if (v.count > max) max = v.count })
  return max
})

function getColorLevel(count: number): number {
  if (count === 0) return 0
  const ratio = count / maxCount.value
  return Math.min(COLOR_LEVELS, Math.ceil(ratio * COLOR_LEVELS))
}

function getKeyColor(level: number): string {
  const colors = [
    'rgba(30, 41, 59, 0.7)',
    'rgba(0, 80, 82, 0.45)',
    'rgba(0, 120, 122, 0.6)',
    'rgba(0, 155, 158, 0.75)',
    'rgba(0, 190, 193, 0.9)',
    'rgba(0, 206, 209, 1)'
  ]
  return colors[Math.min(level, colors.length - 1)]
}

function getKeyTextColor(level: number): string {
  if (level >= 4) return '#ffffff'
  if (level >= 2) return '#e0f7fa'
  return '#94a3b8'
}

function getKeyShadow(level: number): string {
  if (level >= 5) return '0 0 18px rgba(0, 206, 209, 0.65), 0 0 36px rgba(0, 206, 209, 0.35)'
  if (level >= 4) return '0 0 12px rgba(0, 206, 209, 0.45)'
  return 'none'
}

function getKeyData(key: KeyboardKey): KeyData | null {
  return keyDataMap.value.get(key.code) || null
}

function showTooltip(event: MouseEvent, key: KeyboardKey) {
  const data = getKeyData(key)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 14,
    key, data
  }
}

function moveTooltip(event: MouseEvent, key: KeyboardKey) {
  if (!tooltip.value.visible) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltip.value.x = rect.left + rect.width / 2
  tooltip.value.y = rect.top - 14
}

function hideTooltip() { tooltip.value.visible = false }
function formatNumber(num: number): string { return num.toLocaleString('zh-CN') }

const visibleKeys = computed(() => {
  if (viewMode.value === 'full') return keyboardLayout
  return keyboardLayout.filter(k => k.section === viewMode.value)
})

const viewportConfig = computed(() => {
  if (viewMode.value === 'full') {
    return { colStart: 0, colSpan: TOTAL_COLS, rowStart: 0, rowSpan: TOTAL_ROWS }
  }
  const keys = visibleKeys.value
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity
  keys.forEach(k => {
    minCol = Math.min(minCol, k.colStart)
    maxCol = Math.max(maxCol, k.colStart + k.colSpan)
    minRow = Math.min(minRow, k.rowStart)
    maxRow = Math.max(maxRow, k.rowStart + k.rowSpan)
  })
  return {
    colStart: Math.floor(minCol),
    colSpan: Math.ceil(maxCol) - Math.floor(minCol),
    rowStart: minRow,
    rowSpan: maxRow - minRow
  }
})

const gridStyle = computed(() => {
  const vc = viewportConfig.value
  return {
    gridTemplateColumns: `repeat(${vc.colSpan}, 1fr)`,
    gridTemplateRows: `repeat(${vc.rowSpan}, 1fr)`,
    gap: `${GAP}px`
  }
})

const adjustedKeys = computed(() => {
  const vc = viewportConfig.value
  return visibleKeys.value.map(k => ({
    ...k,
    _colStart: k.colStart - vc.colStart,
    _rowStart: k.rowStart - vc.rowStart
  }))
})

const viewOptions = [
  { value: 'full',   label: '完整键盘', icon: '⌨️' },
  { value: 'main',   label: '主键盘区', icon: '🔤' },
  { value: 'numpad', label: '数字键区', icon: '🔢' },
  { value: 'edit',   label: '编辑键区', icon: '✏️' }
]
</script>

<template>
  <div class="keyboard-heatmap">
    <div class="heatmap-header">
      <div class="header-left">
        <h3 class="card-title">
          <span class="title-icon">🔥</span>
          按键热力图
        </h3>
        <span class="total-hint">
          总计：<strong class="total-count">{{ formatNumber(totalCount) }}</strong> 次按键
        </span>
      </div>
      <div class="header-right">
        <div class="view-tabs">
          <div
            v-for="opt in viewOptions"
            :key="opt.value"
            class="view-tab"
            :class="{ active: viewMode === opt.value }"
            @click="viewMode = opt.value as any"
          >
            <span class="tab-icon">{{ opt.icon }}</span>
            <span class="tab-text">{{ opt.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="color-legend">
      <div class="legend-label">低频</div>
      <div class="legend-bar">
        <div
          v-for="i in COLOR_LEVELS"
          :key="i"
          class="legend-segment"
          :style="{ background: getKeyColor(i - 1) }"
        ></div>
      </div>
      <div class="legend-label">高频</div>
    </div>

    <div class="heatmap-container" v-if="!loading">
      <div
        class="keyboard-wrapper"
        :style="{ aspectRatio: `${viewportConfig.colSpan} / ${viewportConfig.rowSpan}` }"
      >
        <div class="keyboard-grid" :style="gridStyle">
          <div
            v-for="key in adjustedKeys"
            :key="key.code"
            class="keyboard-key"
            :style="{
              gridColumn: `${key._colStart + 1} / span ${key.colSpan}`,
              gridRow: `${key._rowStart + 1} / span ${key.rowSpan}`,
              background: getKeyColor(getColorLevel(getKeyData(key)?.count || 0)),
              color: getKeyTextColor(getColorLevel(getKeyData(key)?.count || 0)),
              boxShadow: getKeyShadow(getColorLevel(getKeyData(key)?.count || 0))
            }"
            @mouseenter="showTooltip($event, key)"
            @mousemove="moveTooltip($event, key)"
            @mouseleave="hideTooltip"
            :class="{ 'has-data': (getKeyData(key)?.count || 0) > 0 }"
          >
            <span class="key-label">{{ key.displayLabel || key.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="tooltip.visible && tooltip.key"
          class="key-tooltip"
          :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
        >
          <div class="tooltip-key-name">{{ tooltip.key.code === 'Space' ? 'Space (空格)' : tooltip.key.label }}</div>
          <div class="tooltip-stats">
            <div class="tooltip-stat">
              <span class="stat-label">按键次数</span>
              <span class="stat-value">{{ formatNumber(tooltip.data?.count || 0) }}</span>
            </div>
            <div class="tooltip-stat">
              <span class="stat-label">占比</span>
              <span class="stat-value accent">{{ tooltip.data?.percentage ? tooltip.data.percentage + '%' : '0%' }}</span>
            </div>
          </div>
          <div class="tooltip-arrow"></div>
        </div>
      </Transition>
    </Teleport>

    <div class="empty-state" v-if="loading">
      <div class="empty-icon">⏳</div>
      <div class="empty-text">加载中...</div>
    </div>
  </div>
</template>

<style scoped>
.keyboard-heatmap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left { display: flex; align-items: center; gap: 16px; }

.card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0;
}

.title-icon { font-size: 20px; }

.total-hint { font-size: 12px; color: var(--text-tertiary); }

.total-count {
  color: var(--accent-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 700;
}

.view-tabs {
  display: flex; gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px; border-radius: 10px;
  border: 1px solid var(--border-color);
}

.view-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
  font-size: 12px; color: var(--text-secondary); white-space: nowrap;
}

.view-tab:hover { background: rgba(0, 206, 209, 0.08); color: var(--text-primary); }

.view-tab.active {
  background: linear-gradient(135deg, rgba(0, 206, 209, 0.22), rgba(0, 180, 184, 0.18));
  color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px var(--accent-glow);
}

.tab-icon { font-size: 14px; }

.color-legend {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; padding: 8px 16px;
  background: rgba(0, 206, 209, 0.03);
  border-radius: 8px; border: 1px solid var(--border-color);
  width: fit-content;
}

.legend-label { font-size: 11px; color: var(--text-tertiary); min-width: 28px; }

.legend-bar {
  display: flex; width: 260px; height: 10px;
  border-radius: 5px; overflow: hidden;
}

.legend-segment { flex: 1; }

.heatmap-container {
  flex: 1;
  position: relative;
  background: rgba(10, 14, 23, 0.55);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  overflow: auto;
  min-height: 420px;
}

.keyboard-wrapper {
  width: 100%;
  min-width: min(980px, 100%);
}

.keyboard-grid {
  display: grid;
  width: 100%;
  height: 100%;
}

.keyboard-key {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 206, 209, 0.18);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: 0;
  overflow: hidden;
}

.keyboard-key:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  z-index: 10;
}

.keyboard-key.has-data:hover { filter: brightness(1.18); }

.key-label {
  text-align: center;
  line-height: 1.35;
  white-space: pre-line;
  font-size: clamp(8px, 0.9vw, 12px);
}

.key-tooltip {
  position: fixed;
  z-index: 9999;
  transform: translate(-50%, -100%);
  background: rgba(17, 24, 39, 0.98);
  border: 1px solid rgba(0, 206, 209, 0.4);
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 170px;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 0 22px rgba(0, 206, 209, 0.18);
  backdrop-filter: blur(12px);
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.12s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; transform: translate(-50%, calc(-100% + 6px)); }

.tooltip-key-name {
  font-size: 14px; font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.15);
  font-family: 'Consolas', 'Monaco', monospace;
}

.tooltip-stats { display: flex; flex-direction: column; gap: 6px; }

.tooltip-stat {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
}

.stat-label { font-size: 11px; color: var(--text-tertiary); }

.stat-value {
  font-size: 13px; font-weight: 600;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.stat-value.accent { color: var(--accent-primary); }

.tooltip-arrow {
  position: absolute; bottom: -6px; left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px; height: 10px;
  background: rgba(17, 24, 39, 0.98);
  border-right: 1px solid rgba(0, 206, 209, 0.4);
  border-bottom: 1px solid rgba(0, 206, 209, 0.4);
}

.empty-state {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: var(--text-tertiary); min-height: 400px;
}

.empty-icon { font-size: 64px; opacity: 0.5; margin-bottom: 16px; }

.empty-text { font-size: 14px; }

@media (max-width: 1100px) {
  .keyboard-wrapper { min-width: 880px; }
  .key-label { font-size: 10px; }
}

@media (max-width: 900px) {
  .heatmap-header { flex-direction: column; align-items: flex-start; }
  .view-tabs { flex-wrap: wrap; }
  .view-tab { padding: 6px 10px; font-size: 11px; }
  .keyboard-wrapper { min-width: 780px; }
}
</style>
