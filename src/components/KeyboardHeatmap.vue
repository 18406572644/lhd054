<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, Ref } from 'vue'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

type KeyData = { key: string; count: number; percentage: number }
type KeyboardKey = {
  code: string
  label: string
  width: number
  row: number
  col: number
  section: 'function' | 'main' | 'edit' | 'numpad'
  displayLabel?: string
}

const allKeyData = ref<KeyData[]>([])
const loading = ref(true)
const viewMode = ref<'full' | 'main' | 'numpad' | 'edit'>('full')
const tooltip = ref<{ visible: boolean; x: number; y: number; key: KeyboardKey | null; data: KeyData | null }>({
  visible: false,
  x: 0,
  y: 0,
  key: null,
  data: null
})

const COLOR_LEVELS = 6

const keyboardLayout: KeyboardKey[] = [
  { code: 'Esc', label: 'Esc', width: 1, row: 0, col: 0, section: 'function' },
  { code: 'F1', label: 'F1', width: 1, row: 0, col: 2, section: 'function' },
  { code: 'F2', label: 'F2', width: 1, row: 0, col: 3, section: 'function' },
  { code: 'F3', label: 'F3', width: 1, row: 0, col: 4, section: 'function' },
  { code: 'F4', label: 'F4', width: 1, row: 0, col: 5, section: 'function' },
  { code: 'F5', label: 'F5', width: 1, row: 0, col: 7, section: 'function' },
  { code: 'F6', label: 'F6', width: 1, row: 0, col: 8, section: 'function' },
  { code: 'F7', label: 'F7', width: 1, row: 0, col: 9, section: 'function' },
  { code: 'F8', label: 'F8', width: 1, row: 0, col: 10, section: 'function' },
  { code: 'F9', label: 'F9', width: 1, row: 0, col: 12, section: 'function' },
  { code: 'F10', label: 'F10', width: 1, row: 0, col: 13, section: 'function' },
  { code: 'F11', label: 'F11', width: 1, row: 0, col: 14, section: 'function' },
  { code: 'F12', label: 'F12', width: 1, row: 0, col: 15, section: 'function' },

  { code: '`', label: '`', width: 1, row: 1, col: 0, section: 'main', displayLabel: '` ~' },
  { code: '1', label: '1', width: 1, row: 1, col: 1, section: 'main', displayLabel: '1 !' },
  { code: '2', label: '2', width: 1, row: 1, col: 2, section: 'main', displayLabel: '2 @' },
  { code: '3', label: '3', width: 1, row: 1, col: 3, section: 'main', displayLabel: '3 #' },
  { code: '4', label: '4', width: 1, row: 1, col: 4, section: 'main', displayLabel: '4 $' },
  { code: '5', label: '5', width: 1, row: 1, col: 5, section: 'main', displayLabel: '5 %' },
  { code: '6', label: '6', width: 1, row: 1, col: 6, section: 'main', displayLabel: '6 ^' },
  { code: '7', label: '7', width: 1, row: 1, col: 7, section: 'main', displayLabel: '7 &' },
  { code: '8', label: '8', width: 1, row: 1, col: 8, section: 'main', displayLabel: '8 *' },
  { code: '9', label: '9', width: 1, row: 1, col: 9, section: 'main', displayLabel: '9 (' },
  { code: '0', label: '0', width: 1, row: 1, col: 10, section: 'main', displayLabel: '0 )' },
  { code: '-', label: '-', width: 1, row: 1, col: 11, section: 'main', displayLabel: '- _' },
  { code: '=', label: '=', width: 1, row: 1, col: 12, section: 'main', displayLabel: '= +' },
  { code: 'Backspace', label: 'Backspace', width: 2, row: 1, col: 13, section: 'main' },

  { code: 'Tab', label: 'Tab', width: 1.5, row: 2, col: 0, section: 'main' },
  { code: 'Q', label: 'Q', width: 1, row: 2, col: 1.5, section: 'main' },
  { code: 'W', label: 'W', width: 1, row: 2, col: 2.5, section: 'main' },
  { code: 'E', label: 'E', width: 1, row: 2, col: 3.5, section: 'main' },
  { code: 'R', label: 'R', width: 1, row: 2, col: 4.5, section: 'main' },
  { code: 'T', label: 'T', width: 1, row: 2, col: 5.5, section: 'main' },
  { code: 'Y', label: 'Y', width: 1, row: 2, col: 6.5, section: 'main' },
  { code: 'U', label: 'U', width: 1, row: 2, col: 7.5, section: 'main' },
  { code: 'I', label: 'I', width: 1, row: 2, col: 8.5, section: 'main' },
  { code: 'O', label: 'O', width: 1, row: 2, col: 9.5, section: 'main' },
  { code: 'P', label: 'P', width: 1, row: 2, col: 10.5, section: 'main' },
  { code: '[', label: '[', width: 1, row: 2, col: 11.5, section: 'main', displayLabel: '[ {' },
  { code: ']', label: ']', width: 1, row: 2, col: 12.5, section: 'main', displayLabel: '] }' },
  { code: '\\', label: '\\', width: 1.5, row: 2, col: 13.5, section: 'main', displayLabel: '\\ |' },

  { code: 'CapsLock', label: 'CapsLock', width: 1.75, row: 3, col: 0, section: 'main' },
  { code: 'A', label: 'A', width: 1, row: 3, col: 1.75, section: 'main' },
  { code: 'S', label: 'S', width: 1, row: 3, col: 2.75, section: 'main' },
  { code: 'D', label: 'D', width: 1, row: 3, col: 3.75, section: 'main' },
  { code: 'F', label: 'F', width: 1, row: 3, col: 4.75, section: 'main' },
  { code: 'G', label: 'G', width: 1, row: 3, col: 5.75, section: 'main' },
  { code: 'H', label: 'H', width: 1, row: 3, col: 6.75, section: 'main' },
  { code: 'J', label: 'J', width: 1, row: 3, col: 7.75, section: 'main' },
  { code: 'K', label: 'K', width: 1, row: 3, col: 8.75, section: 'main' },
  { code: 'L', label: 'L', width: 1, row: 3, col: 9.75, section: 'main' },
  { code: ';', label: ';', width: 1, row: 3, col: 10.75, section: 'main', displayLabel: '; :' },
  { code: "'", label: "'", width: 1, row: 3, col: 11.75, section: 'main', displayLabel: "' \"" },
  { code: 'Enter', label: 'Enter', width: 2.25, row: 3, col: 12.75, section: 'main' },

  { code: 'Shift', label: 'Shift', width: 2.25, row: 4, col: 0, section: 'main' },
  { code: 'Z', label: 'Z', width: 1, row: 4, col: 2.25, section: 'main' },
  { code: 'X', label: 'X', width: 1, row: 4, col: 3.25, section: 'main' },
  { code: 'C', label: 'C', width: 1, row: 4, col: 4.25, section: 'main' },
  { code: 'V', label: 'V', width: 1, row: 4, col: 5.25, section: 'main' },
  { code: 'B', label: 'B', width: 1, row: 4, col: 6.25, section: 'main' },
  { code: 'N', label: 'N', width: 1, row: 4, col: 7.25, section: 'main' },
  { code: 'M', label: 'M', width: 1, row: 4, col: 8.25, section: 'main' },
  { code: ',', label: ',', width: 1, row: 4, col: 9.25, section: 'main', displayLabel: ', <' },
  { code: '.', label: '.', width: 1, row: 4, col: 10.25, section: 'main', displayLabel: '. >' },
  { code: '/', label: '/', width: 1, row: 4, col: 11.25, section: 'main', displayLabel: '/ ?' },
  { code: 'Shift_R', label: 'Shift', width: 2.75, row: 4, col: 12.25, section: 'main' },

  { code: 'Ctrl', label: 'Ctrl', width: 1.25, row: 5, col: 0, section: 'main' },
  { code: 'Win', label: 'Win', width: 1.25, row: 5, col: 1.25, section: 'main' },
  { code: 'Alt', label: 'Alt', width: 1.25, row: 5, col: 2.5, section: 'main' },
  { code: 'Space', label: 'Space', width: 6.25, row: 5, col: 3.75, section: 'main' },
  { code: 'Alt_R', label: 'Alt', width: 1.25, row: 5, col: 10, section: 'main' },
  { code: 'Win_R', label: 'Win', width: 1.25, row: 5, col: 11.25, section: 'main' },
  { code: 'Menu', label: 'Menu', width: 1.25, row: 5, col: 12.5, section: 'main' },
  { code: 'Ctrl_R', label: 'Ctrl', width: 1.25, row: 5, col: 13.75, section: 'main' },

  { code: 'PrintScreen', label: 'PrtSc', width: 1, row: 0, col: 17, section: 'edit' },
  { code: 'ScrollLock', label: 'Scroll', width: 1, row: 0, col: 18, section: 'edit' },
  { code: 'Pause', label: 'Pause', width: 1, row: 0, col: 19, section: 'edit' },

  { code: 'Insert', label: 'Ins', width: 1, row: 1, col: 17, section: 'edit' },
  { code: 'Home', label: 'Home', width: 1, row: 1, col: 18, section: 'edit' },
  { code: 'PageUp', label: 'PgUp', width: 1, row: 1, col: 19, section: 'edit' },

  { code: 'Delete', label: 'Del', width: 1, row: 2, col: 17, section: 'edit' },
  { code: 'End', label: 'End', width: 1, row: 2, col: 18, section: 'edit' },
  { code: 'PageDown', label: 'PgDn', width: 1, row: 2, col: 19, section: 'edit' },

  { code: '↑', label: '↑', width: 1, row: 4, col: 18, section: 'edit' },
  { code: '←', label: '←', width: 1, row: 5, col: 17, section: 'edit' },
  { code: '↓', label: '↓', width: 1, row: 5, col: 18, section: 'edit' },
  { code: '→', label: '→', width: 1, row: 5, col: 19, section: 'edit' },

  { code: 'NumLock', label: 'Num', width: 1, row: 1, col: 21, section: 'numpad' },
  { code: 'Num/', label: '/', width: 1, row: 1, col: 22, section: 'numpad' },
  { code: 'Num*', label: '*', width: 1, row: 1, col: 23, section: 'numpad' },
  { code: 'Num-', label: '-', width: 1, row: 1, col: 24, section: 'numpad' },

  { code: 'Num7', label: '7', width: 1, row: 2, col: 21, section: 'numpad' },
  { code: 'Num8', label: '8', width: 1, row: 2, col: 22, section: 'numpad' },
  { code: 'Num9', label: '9', width: 1, row: 2, col: 23, section: 'numpad' },
  { code: 'Num+', label: '+', width: 1, row: 2, col: 24, section: 'numpad', displayLabel: '+' },

  { code: 'Num4', label: '4', width: 1, row: 3, col: 21, section: 'numpad' },
  { code: 'Num5', label: '5', width: 1, row: 3, col: 22, section: 'numpad' },
  { code: 'Num6', label: '6', width: 1, row: 3, col: 23, section: 'numpad' },

  { code: 'Num1', label: '1', width: 1, row: 4, col: 21, section: 'numpad' },
  { code: 'Num2', label: '2', width: 1, row: 4, col: 22, section: 'numpad' },
  { code: 'Num3', label: '3', width: 1, row: 4, col: 23, section: 'numpad' },
  { code: 'NumEnter', label: 'Enter', width: 1, row: 4, col: 24, section: 'numpad', displayLabel: 'Enter' },

  { code: 'Num0', label: '0', width: 2, row: 5, col: 21, section: 'numpad' },
  { code: 'Num.', label: '.', width: 1, row: 5, col: 23, section: 'numpad' }
]

const codeToKeyMap = new Map<string, KeyboardKey>()
keyboardLayout.forEach(k => {
  codeToKeyMap.set(k.code, k)
  if (k.code.startsWith('Num')) {
    const numKey = k.code.replace('Num', '')
    if (!codeToKeyMap.has(numKey)) {
      codeToKeyMap.set(numKey, k)
    }
  }
})

const keyCodeAliases: Record<string, string[]> = {
  'Shift': ['Shift', 'Shift_R'],
  'Ctrl': ['Ctrl', 'Ctrl_R'],
  'Alt': ['Alt', 'Alt_R'],
  'Win': ['Win', 'Win_R']
}

function resolveKeyCode(code: string): string[] {
  if (keyCodeAliases[code]) {
    return keyCodeAliases[code]
  }
  if (codeToKeyMap.has(code)) {
    return [code]
  }
  if (code.startsWith('Num')) {
    const stripped = code.replace('Num', '')
    if (codeToKeyMap.has(code)) {
      return [code]
    }
    if (codeToKeyMap.has(stripped)) {
      return [stripped]
    }
  }
  return []
}

function getAggregatedCount(): Map<string, { count: number; percentage: number }> {
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
}

onMounted(() => {
  loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

watch(selectedAppFilter, () => {
  loadData()
})

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

const aggregatedMap = computed(() => getAggregatedCount())

const keyDataMap = computed(() => {
  const map = new Map<string, KeyData>()
  aggregatedMap.value.forEach((value, key) => {
    map.set(key, { key, count: value.count, percentage: Math.round(value.percentage * 100) / 100 })
  })
  return map
})

const totalCount = computed(() => {
  return allKeyData.value.reduce((sum, k) => sum + k.count, 0)
})

const maxCount = computed(() => {
  if (aggregatedMap.value.size === 0) return 1
  let max = 1
  aggregatedMap.value.forEach(v => {
    if (v.count > max) max = v.count
  })
  return max
})

function getColorLevel(count: number): number {
  if (count === 0) return 0
  const ratio = count / maxCount.value
  const level = Math.min(COLOR_LEVELS, Math.ceil(ratio * COLOR_LEVELS))
  return level
}

function getKeyColor(level: number): string {
  const colors = [
    'rgba(30, 41, 59, 0.6)',
    'rgba(0, 100, 102, 0.4)',
    'rgba(0, 140, 143, 0.55)',
    'rgba(0, 170, 173, 0.7)',
    'rgba(0, 206, 209, 0.85)',
    'rgba(0, 206, 209, 1)'
  ]
  return colors[Math.min(level, colors.length - 1)]
}

function getKeyTextColor(level: number): string {
  if (level >= 4) return '#ffffff'
  if (level >= 2) return '#e0f7fa'
  return '#a0aec0'
}

function getKeyShadow(level: number): string {
  if (level >= 5) return '0 0 16px rgba(0, 206, 209, 0.6), 0 0 32px rgba(0, 206, 209, 0.3)'
  if (level >= 4) return '0 0 10px rgba(0, 206, 209, 0.4)'
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
    y: rect.top - 12,
    key,
    data
  }
}

function moveTooltip(event: MouseEvent, key: KeyboardKey) {
  if (!tooltip.value.visible) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltip.value.x = rect.left + rect.width / 2
  tooltip.value.y = rect.top - 12
}

function hideTooltip() {
  tooltip.value.visible = false
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const visibleKeys = computed(() => {
  if (viewMode.value === 'full') {
    return keyboardLayout
  }
  return keyboardLayout.filter(k => k.section === viewMode.value)
})

const gridConfig = computed(() => {
  if (viewMode.value === 'full') {
    return { cols: 25, offsetX: 0 }
  }
  const keys = visibleKeys.value
  const minCol = Math.min(...keys.map(k => k.col))
  const maxCol = Math.max(...keys.map(k => k.col + k.width))
  return { cols: Math.ceil(maxCol - minCol), offsetX: minCol }
})

const viewOptions = [
  { value: 'full', label: '完整键盘', icon: '⌨️' },
  { value: 'main', label: '主键盘区', icon: '🔤' },
  { value: 'numpad', label: '数字键区', icon: '🔢' },
  { value: 'edit', label: '编辑键区', icon: '✏️' }
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
        <span class="total-hint">总计：<strong class="total-count">{{ formatNumber(totalCount) }}</strong> 次按键</span>
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
      <div class="legend-label">低</div>
      <div class="legend-bar">
        <div v-for="i in COLOR_LEVELS" :key="i" class="legend-segment" :style="{ background: getKeyColor(i - 1) }"></div>
      </div>
      <div class="legend-label">高</div>
    </div>

    <div class="heatmap-container" v-if="!loading">
      <div
        class="keyboard-grid"
        :style="{
          gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`
        }"
      >
        <div
          v-for="key in visibleKeys"
          :key="key.code"
          class="keyboard-key"
          :style="{
            gridColumn: `${Math.round((key.col - gridConfig.offsetX) * 4) + 1} / span ${Math.round(key.width * 4)}`,
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

      <Teleport to="body">
        <div
          v-if="tooltip.visible && tooltip.key"
          class="key-tooltip"
          :style="{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`
          }"
        >
          <div class="tooltip-key-name">{{ tooltip.key.label }}</div>
          <div class="tooltip-stats">
            <div class="tooltip-stat">
              <span class="stat-label">次数</span>
              <span class="stat-value">{{ formatNumber(tooltip.data?.count || 0) }}</span>
            </div>
            <div class="tooltip-stat">
              <span class="stat-label">占比</span>
              <span class="stat-value accent">{{ tooltip.data?.percentage ? tooltip.data.percentage + '%' : '0%' }}</span>
            </div>
          </div>
          <div class="tooltip-arrow"></div>
        </div>
      </Teleport>
    </div>

    <div class="empty-state" v-else>
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
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.total-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.total-count {
  color: var(--accent-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 700;
}

.view-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.view-tab:hover {
  background: rgba(0, 206, 209, 0.08);
  color: var(--text-primary);
}

.view-tab.active {
  background: linear-gradient(135deg, rgba(0, 206, 209, 0.2), rgba(0, 180, 184, 0.2));
  color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px var(--accent-glow);
}

.tab-icon {
  font-size: 14px;
}

.color-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 10px 16px;
  background: rgba(0, 206, 209, 0.03);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  width: fit-content;
}

.legend-label {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 20px;
}

.legend-bar {
  display: flex;
  width: 240px;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
}

.legend-segment {
  flex: 1;
}

.heatmap-container {
  flex: 1;
  position: relative;
  background: rgba(10, 14, 23, 0.5);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  overflow: auto;
  min-height: 400px;
}

.keyboard-grid {
  display: grid;
  gap: 6px;
  min-width: fit-content;
  grid-template-columns: repeat(100, 1fr);
}

.keyboard-key {
  aspect-ratio: 1 / 1;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 206, 209, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.keyboard-key:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  z-index: 10;
}

.keyboard-key.has-data:hover {
  filter: brightness(1.15);
}

.key-label {
  text-align: center;
  line-height: 1.3;
  white-space: pre-line;
}

.key-tooltip {
  position: fixed;
  z-index: 9999;
  transform: translate(-50%, -100%);
  background: rgba(17, 24, 39, 0.98);
  border: 1px solid rgba(0, 206, 209, 0.4);
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 160px;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 206, 209, 0.15);
  backdrop-filter: blur(10px);
}

.tooltip-key-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.15);
  font-family: 'Consolas', 'Monaco', monospace;
}

.tooltip-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.stat-value.accent {
  color: var(--accent-primary);
}

.tooltip-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: rgba(17, 24, 39, 0.98);
  border-right: 1px solid rgba(0, 206, 209, 0.4);
  border-bottom: 1px solid rgba(0, 206, 209, 0.4);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  min-height: 400px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
}

@media (max-width: 900px) {
  .heatmap-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .view-tabs {
    flex-wrap: wrap;
  }

  .view-tab {
    padding: 6px 10px;
    font-size: 11px;
  }

  .keyboard-key {
    min-width: 28px;
    min-height: 28px;
    font-size: 9px;
  }
}
</style>
