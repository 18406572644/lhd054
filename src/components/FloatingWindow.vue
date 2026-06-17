<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'

const totalCount = ref(0)
const speed = ref(0)
const currentApp = ref('未知应用')
const currentStyle = ref<'bar' | 'ring' | 'panel'>('bar')
const isHovered = ref(false)
const isDragging = ref(false)

const DRAG_THRESHOLD = 5
let startX = 0
let startY = 0
let hasMoved = false

const formattedCount = computed(() => {
  return totalCount.value.toLocaleString('zh-CN')
})

let statsUnsubscribe: (() => void) | null = null
let styleUnsubscribe: (() => void) | null = null

onMounted(async () => {
  if (window.electronAPI?.floatingGetConfig) {
    const config = await window.electronAPI.floatingGetConfig()
    currentStyle.value = config.style as 'bar' | 'ring' | 'panel'
  }

  if (window.electronAPI?.onFloatingStats) {
    statsUnsubscribe = window.electronAPI.onFloatingStats((data) => {
      totalCount.value = data.total
      speed.value = data.speed
      currentApp.value = data.appName || '未知应用'
    })
  }

  if (window.electronAPI?.onFloatingStyleChanged) {
    styleUnsubscribe = window.electronAPI.onFloatingStyleChanged((style) => {
      currentStyle.value = style as 'bar' | 'ring' | 'panel'
    })
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  statsUnsubscribe?.()
  styleUnsubscribe?.()
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  
  startX = e.screenX
  startY = e.screenY
  hasMoved = false
  isDragging.value = false

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const offsetX = e.clientX - rect.left
  const offsetY = e.clientY - rect.top

  if (window.electronAPI?.floatingDragStart) {
    window.electronAPI.floatingDragStart(offsetX, offsetY)
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!hasMoved && !isDragging.value) {
    const dx = Math.abs(e.screenX - startX)
    const dy = Math.abs(e.screenY - startY)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      hasMoved = true
      isDragging.value = true
    }
  }

  if (isDragging.value && window.electronAPI?.floatingDragMove) {
    window.electronAPI.floatingDragMove(e.screenX, e.screenY)
  }
}

function handleMouseUp() {
  if (isDragging.value && window.electronAPI?.floatingDragEnd) {
    window.electronAPI.floatingDragEnd()
  }
  isDragging.value = false
}

function handleClick() {
  if (hasMoved) return
  if (window.electronAPI?.floatingShowMain) {
    window.electronAPI.floatingShowMain()
  }
}

function handleRightClick(e: MouseEvent) {
  e.preventDefault()
  if (window.electronAPI?.floatingContextMenu) {
    window.electronAPI.floatingContextMenu()
  }
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}

const dashOffset = computed(() => {
  const maxSpeed = 200
  const percentage = Math.min(speed.value / maxSpeed, 1)
  const circumference = 2 * Math.PI * 45
  return circumference * (1 - percentage)
})
</script>

<template>
  <div
    class="floating-container"
    :class="[`style-${currentStyle}`, { hovered: isHovered, dragging: isDragging }]"
    @click="handleClick"
    @contextmenu="handleRightClick"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <template v-if="currentStyle === 'bar'">
      <div class="bar-style">
        <div class="bar-icon">⌨️</div>
        <div class="bar-content">
          <div class="bar-count">{{ formattedCount }}</div>
          <div class="bar-info">
            <span class="bar-speed">{{ speed }} KPM</span>
            <span class="bar-app">{{ currentApp }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="currentStyle === 'ring'">
      <div class="ring-style">
        <svg class="ring-svg" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#00ced1" />
              <stop offset="100%" style="stop-color:#00a5a8" />
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="60" cy="60" r="45" />
          <circle
            class="ring-progress"
            cx="60"
            cy="60"
            r="45"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <div class="ring-content">
          <div class="ring-count">{{ formattedCount }}</div>
          <div class="ring-label">今日按键</div>
        </div>
        <div class="ring-speed">{{ speed }} KPM</div>
      </div>
    </template>

    <template v-else-if="currentStyle === 'panel'">
      <div class="panel-style">
        <div class="panel-header">
          <span class="panel-title">⌨️ 键盘统计</span>
        </div>
        <div class="panel-main">
          <div class="panel-count">{{ formattedCount }}</div>
          <div class="panel-label">今日按键</div>
        </div>
        <div class="panel-footer">
          <div class="panel-speed">
            <span class="speed-icon">⚡</span>
            <span>{{ speed }} KPM</span>
          </div>
          <div class="panel-app" :title="currentApp">
            <span class="app-icon">📱</span>
            <span class="app-name">{{ currentApp }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.floating-container {
  width: 100%;
  height: 100%;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.floating-container.dragging {
  cursor: grabbing;
}

.bar-style {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: linear-gradient(135deg, rgba(10, 14, 23, 0.95) 0%, rgba(26, 34, 52, 0.95) 100%);
  border: 1px solid rgba(0, 206, 209, 0.3);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 206, 209, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.hovered .bar-style {
  border-color: rgba(0, 206, 209, 0.6);
  box-shadow: 0 6px 30px rgba(0, 206, 209, 0.3);
}

.bar-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.bar-content {
  flex: 1;
  min-width: 0;
}

.bar-count {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #fff;
  line-height: 1.2;
}

.bar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
}

.bar-speed {
  color: #00ced1;
  font-weight: 600;
  flex-shrink: 0;
}

.bar-app {
  color: #a0aec0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ring-style {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(10, 14, 23, 0.95) 0%, rgba(26, 34, 52, 0.9) 100%);
  border: 1px solid rgba(0, 206, 209, 0.3);
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 206, 209, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.hovered .ring-style {
  border-color: rgba(0, 206, 209, 0.6);
  box-shadow: 0 6px 30px rgba(0, 206, 209, 0.4);
}

.ring-svg {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.ring-bg {
  fill: none;
  stroke: rgba(0, 206, 209, 0.15);
  stroke-width: 6;
}

.ring-progress {
  fill: none;
  stroke: url(#ringGradient);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 282.74;
  transition: stroke-dashoffset 0.3s ease;
}

.ring-content {
  text-align: center;
  z-index: 1;
}

.ring-count {
  font-size: 22px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #fff;
  line-height: 1;
}

.ring-label {
  font-size: 10px;
  color: #a0aec0;
  margin-top: 4px;
}

.ring-speed {
  position: absolute;
  bottom: 16px;
  font-size: 11px;
  color: #00ced1;
  font-weight: 600;
}

.panel-style {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 14px;
  background: linear-gradient(135deg, rgba(10, 14, 23, 0.95) 0%, rgba(26, 34, 52, 0.95) 100%);
  border: 1px solid rgba(0, 206, 209, 0.3);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 206, 209, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.hovered .panel-style {
  border-color: rgba(0, 206, 209, 0.6);
  box-shadow: 0 6px 30px rgba(0, 206, 209, 0.3);
}

.panel-header {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.15);
}

.panel-title {
  font-size: 12px;
  color: #a0aec0;
  font-weight: 500;
}

.panel-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}

.panel-count {
  font-size: 36px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  background: linear-gradient(135deg, #00ced1, #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.panel-label {
  font-size: 11px;
  color: #718096;
  margin-top: 6px;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 206, 209, 0.15);
  font-size: 11px;
}

.panel-speed {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #00ced1;
  font-weight: 600;
}

.speed-icon {
  font-size: 12px;
}

.panel-app {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #a0aec0;
  max-width: 50%;
  overflow: hidden;
}

.app-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.app-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
