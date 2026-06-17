<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { IconMinus, IconFullscreen, IconFullscreenExit, IconClose, IconCheck, IconUpload, IconInfoCircle } from '@arco-design/web-vue/es/icon'
import dayjs from 'dayjs'

const props = defineProps<{
  todayCount: number
  lastKey: string
}>()

const isMaximized = ref(false)
const currentTime = ref('')
const appVersion = ref('')
const updateStatus = ref<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
const downloadProgress = ref(0)
const updateInfo = ref<any>(null)

let timeInterval: number | null = null

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
  checkMaximized()
  loadAppVersion()
  setupUpdaterListener()
})

let removeUpdaterListener: (() => void) | null = null

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  if (removeUpdaterListener) {
    removeUpdaterListener()
  }
})

async function loadAppVersion() {
  if (!window.electronAPI) return
  const electronAPI = window.electronAPI
  appVersion.value = await electronAPI.getAppVersion()
}

function setupUpdaterListener() {
  if (!window.electronAPI) return
  const electronAPI = window.electronAPI
  removeUpdaterListener = electronAPI.onUpdaterMessage((message: { status: string; data?: any }) => {
    switch (message.status) {
      case 'checking':
        updateStatus.value = 'checking'
        break
      case 'update-available':
        updateStatus.value = 'available'
        updateInfo.value = message.data
        break
      case 'update-not-available':
        updateStatus.value = 'not-available'
        break
      case 'downloading':
        updateStatus.value = 'downloading'
        downloadProgress.value = message.data?.percent || 0
        break
      case 'update-downloaded':
        updateStatus.value = 'downloaded'
        updateInfo.value = message.data
        break
      case 'error':
        updateStatus.value = 'error'
        break
    }
  })
}

async function handleUpdateClick() {
  if (!window.electronAPI) return
  const electronAPI = window.electronAPI
  
  if (updateStatus.value === 'available') {
    await electronAPI.downloadUpdate()
  } else if (updateStatus.value === 'downloaded') {
    await electronAPI.installUpdate()
  } else if (updateStatus.value === 'idle' || updateStatus.value === 'error' || updateStatus.value === 'not-available') {
    updateStatus.value = 'checking'
    await electronAPI.checkForUpdates()
  }
}

function updateTime() {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

async function checkMaximized() {
  if (!window.electronAPI) return
  const electronAPI = window.electronAPI
  isMaximized.value = await electronAPI.isMaximized()
}

function handleMinimize() {
  if (!window.electronAPI) return
  window.electronAPI.minimize()
}

async function handleMaximize() {
  if (!window.electronAPI) return
  window.electronAPI.maximize()
  await checkMaximized()
}

function handleClose() {
  if (!window.electronAPI) return
  window.electronAPI.close()
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
      <div class="version-info" :class="{ clickable: updateStatus !== 'downloading' }" @click="handleUpdateClick">
        <span class="version-label">v{{ appVersion }}</span>
        <span v-if="updateStatus === 'checking'" class="update-badge checking">
          <icon-info-circle />
          检查中...
        </span>
        <span v-else-if="updateStatus === 'available'" class="update-badge available" title="点击下载更新">
          <icon-upload />
          有新版本
        </span>
        <span v-else-if="updateStatus === 'downloading'" class="update-badge downloading">
          下载中 {{ downloadProgress.toFixed(0) }}%
        </span>
        <span v-else-if="updateStatus === 'downloaded'" class="update-badge downloaded" title="点击立即安装重启">
          <icon-check />
          立即更新
        </span>
        <span v-else-if="updateStatus === 'not-available'" class="update-badge not-available">
          <icon-check />
          已是最新
        </span>
        <span v-else-if="updateStatus === 'error'" class="update-badge error" title="点击重新检查">
          检查失败
        </span>
      </div>
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

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
  -webkit-app-region: no-drag;
  font-size: 12px;
  color: var(--text-tertiary);
  transition: all 0.2s;
}

.version-info.clickable {
  cursor: pointer;
}

.version-info.clickable:hover {
  color: var(--text-secondary);
}

.version-label {
  font-family: 'Consolas', 'Monaco', monospace;
}

.update-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.update-badge.checking {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.update-badge.available {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
  animation: pulse-glow 2s ease-in-out infinite;
}

.update-badge.downloading {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.update-badge.downloaded {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.update-badge.not-available {
  background: rgba(107, 114, 128, 0.15);
  color: #9ca3af;
}

.update-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
