<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref } from 'vue'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const frequentKeys = ref<Array<{ key: string; count: number; percentage: number }>>([])
const loading = ref(true)

const commonKeys = ['Space', 'Enter', 'Backspace', 'Shift', 'Ctrl', 'A', 'S', 'D', 'W', 'E', 'R', 'F', 'J', 'K', 'L', 'N', 'M']

onMounted(() => {
  loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

async function loadData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const data = await window.electronAPI.getKeyFrequency(30)
    frequentKeys.value = data
  } finally {
    loading.value = false
  }
}

function isCommonKey(key: string): boolean {
  return commonKeys.includes(key)
}

function getKeyStyle(key: string): string {
  if (isCommonKey(key)) return 'common'
  if (key >= '0' && key <= '9') return 'number'
  if (key.length === 1 && /[A-Z]/.test(key)) return 'letter'
  return 'other'
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const maxCount = computed(() => {
  return frequentKeys.value.reduce((max, k) => Math.max(max, k.count), 1)
})
</script>

<template>
  <div class="frequent-keys">
    <div class="card-header">
      <h3 class="card-title">
      <span class="title-icon">⌨️</span>
        常用按键
      </h3>
      <span class="card-subtitle">Top 30 按键频次</span>
    </div>
    
    <div class="keys-container" v-if="!loading && frequentKeys.length > 0">
      <div class="key-list">
        <div
          v-for="(item, index) in frequentKeys"
          :key="item.key"
          class="key-item"
          :class="[getKeyStyle(item.key), { 'rank-top': index < 5 }]">
          <div class="key-rank">{{ index + 1 }}</div>
          <div class="key-name">{{ item.key }}</div>
          <div class="key-bar-wrapper">
            <div 
              class="key-bar" 
              :style="{ width: `${(item.count / maxCount) * 100}%` }">
            </div>
          </div>
          <div class="key-count">{{ formatNumber(item.count) }}</div>
          <div class="key-percent">{{ item.percentage }}%</div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else-if="!loading && frequentKeys.length === 0">
      <div class="empty-icon">⌨️</div>
      <div class="empty-text">暂无按键数据</div>
      <div class="empty-hint">开始打字即可统计按键记录</div>
    </div>
    
    <div class="empty-state" v-else>
      <div class="empty-icon">⏳</div>
      <div class="empty-text">加载中...</div>
    </div>
  </div>
</template>

<style scoped>
.frequent-keys {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.title-icon {
  font-size: 20px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

.keys-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.key-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
}

.key-item:hover {
  background: rgba(0, 206, 209, 0.05);
  border-color: var(--border-color);
}

.key-item.rank-top {
  background: rgba(0, 206, 209, 0.08);
}

.key-item.common .key-name {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: #fff;
}

.key-item.letter .key-name {
  background: rgba(0, 206, 209, 0.2);
  color: var(--accent-primary);
}

.key-item.number .key-name {
  background: rgba(245, 158, 11, 0.2);
  color: var(--warning);
}

.key-rank {
  width: 24px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-align: center;
}

.key-name {
  min-width: 60px;
  padding: 4px 12px;
  text-align: center;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.key-bar-wrapper {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.key-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 3px;
  transition: width 0.5s ease-out;
}

.key-count {
  min-width: 70px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.key-percent {
  min-width: 50px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}
</style>
