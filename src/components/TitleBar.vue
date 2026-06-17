<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { IconMinus, IconFullscreen, IconFullscreenExit, IconClose } from '@arco-design/web-vue/es/icon'
import dayjs from 'dayjs'

const props = defineProps<{
  todayCount: number
  lastKey: string
}>()

const isMaximized = ref(false)
const currentTime = ref('')

let timeInterval: number | null = null

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
  checkMaximized()
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

function updateTime() {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

async function checkMaximized() {
  if (window.electronAPI?.isMaximized) {
    isMaximized.value = await window.electronAPI.isMaximized()
  }
}

function handleMinimize() {
  window.electronAPI?.minimize()
}

async function handleMaximize() {
  window.electronAPI?.maximize()
  await checkMaximized()
}

function handleClose() {
  window.electronAPI?.close()
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}
</script>

<template>
  <div class="title-bar">
    <div class="title-bar-left">
      <div class="logo">
        <span class="logo-icon">⌨</span>
        <span class="logo-text">Keyboard Stats</span>
      </div>
      <div class="divider"></div>
      <div class="status-info">
        <div class="status-item">
          <span class="status-label">今日按键</span>
          <span class="status-value count" :key="props.todayCount">{{ formatNumber(props.todayCount) }}</span>
        </div>
        <div class="status-item" v-if="props.lastKey">
          <span class="status-label">最近按键</span>
          <span class="status-value key" :key="props.lastKey">{{ props.lastKey }}</span>
        </div>
      </div>
    </div>
    
    <div class="title-bar-center">
      <span class="current-time">{{ currentTime }}</span>
    </div>
    
    <div class="title-bar-right">
      <div class="window-controls">
        <button class="window-btn minimize" @click="handleMinimize" title="最小化">
          <icon-minus />
        </button>
        <button class="window-btn maximize" @click="handleMaximize" title="最大化">
          <icon-fullscreen v-if="!isMaximized" />
          <icon-fullscreen-exit v-else />
        </button>
        <button class="window-btn close" @click="handleClose" title="关闭到托盘">
          <icon-close />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(17, 24, 39, 0.8) 100%);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: var(--accent-primary);
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-primary), #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.status-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-value.count {
  color: var(--accent-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.status-value.key {
  display: inline-block;
  min-width: 40px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  font-family: 'Consolas', 'Monaco', monospace;
  animation: count-up 0.2s ease-out;
}

.title-bar-center {
  flex: 1;
  text-align: center;
}

.current-time {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 1px;
}

.title-bar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.window-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.window-btn {
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.window-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.window-btn.close:hover {
  background: var(--danger);
  color: #fff;
}
</style>
