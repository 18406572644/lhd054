<script setup lang="ts">
import { ref, inject, watch, Ref, onMounted, computed } from 'vue'
import TodayStats from './TodayStats.vue'
import KeyFrequency from './KeyFrequency.vue'
import FrequentKeys from './FrequentKeys.vue'
import DailyCompare from './DailyCompare.vue'
import HourlyChart from './HourlyChart.vue'
import ExportPanel from './ExportPanel.vue'
import AppStats from './AppStats.vue'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

const activeTab = ref('overview')
const availableApps = ref<Array<{ app_name: string; total_count: number }>>([])

const tabs = [
  { key: 'overview', label: '总览', icon: '📊' },
  { key: 'frequency', label: '按键频率', icon: '📈' },
  { key: 'app-stats', label: '应用统计', icon: '💻' },
  { key: 'compare', label: '数据对比', icon: '📉' },
  { key: 'export', label: '导出数据', icon: '📥' }
]

const displayApps = computed(() => {
  return availableApps.value.slice(0, 15)
})

onMounted(() => {
  loadAvailableApps()
})

watch(() => refreshTrigger?.value, () => {
  loadAvailableApps()
})

async function loadAvailableApps() {
  if (!window.electronAPI) return
  try {
    const apps = await window.electronAPI.getAvailableApps()
    availableApps.value = apps
  } catch {
  }
}

watch(activeTab, () => {
})

function clearAppFilter() {
  selectedAppFilter.value = 'all'
}

watch(selectedAppFilter, () => {
  if (refreshTrigger) {
    refreshTrigger.value++
  }
})
</script>

<template>
  <div class="dashboard">
    <div class="sidebar">
      <div class="nav-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <div class="tab-indicator"></div>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <div class="filter-section" v-if="availableApps.length > 0">
          <div class="filter-header">
            <span class="filter-title">🔍 应用筛选</span>
            <button 
              class="clear-filter-btn" 
              v-if="selectedAppFilter !== 'all'"
              @click="clearAppFilter"
            >
              清除
            </button>
          </div>
          <div class="app-filter-list">
            <div 
              class="filter-item"
              :class="{ active: selectedAppFilter === 'all' }"
              @click="selectedAppFilter = 'all'"
            >
              <span class="filter-icon">🌐</span>
              <span class="filter-name">全部应用</span>
            </div>
            <div 
              v-for="app in displayApps" 
              :key="app.app_name"
              class="filter-item"
              :class="{ active: selectedAppFilter === app.app_name }"
              @click="selectedAppFilter = app.app_name"
              :title="app.app_name"
            >
              <span class="filter-icon app-letter">{{ app.app_name.charAt(0) }}</span>
              <span class="filter-name">{{ app.app_name }}</span>
              <span class="filter-count">{{ app.total_count.toLocaleString('zh-CN') }}</span>
            </div>
          </div>
        </div>
        
        <div class="running-status">
          <span class="status-dot"></span>
          <span class="status-text">后台运行中</span>
        </div>
        <div class="version">v1.0.0</div>
      </div>
    </div>
    
    <div class="main-content">
      <div class="active-filter-banner" v-if="selectedAppFilter !== 'all'">
        <div class="banner-content">
          <span class="banner-icon">💻</span>
          <span class="banner-text">当前筛选：<strong>{{ selectedAppFilter }}</strong></span>
          <span class="banner-hint">（总览、频率、对比页面数据将按此应用过滤）</span>
        </div>
        <button class="banner-close" @click="clearAppFilter">×</button>
      </div>
      
      <div class="content-wrapper" v-show="activeTab === 'overview'">
        <div class="grid-row row-1">
          <TodayStats />
        </div>
        <div class="grid-row row-2">
          <div class="col col-left">
            <FrequentKeys />
          </div>
          <div class="col col-right">
            <HourlyChart />
          </div>
        </div>
      </div>
      
      <div class="content-wrapper" v-show="activeTab === 'frequency'">
        <KeyFrequency />
      </div>
      
      <div class="content-wrapper" v-show="activeTab === 'app-stats'">
        <AppStats />
      </div>
      
      <div class="content-wrapper" v-show="activeTab === 'compare'">
        <DailyCompare />
      </div>
      
      <div class="content-wrapper" v-show="activeTab === 'export'">
        <ExportPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.sidebar {
  width: 200px;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.9) 0%, rgba(17, 24, 39, 0.7) 100%);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}

.nav-tabs {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  cursor: pointer;
  transition: all 0.3s;
  color: var(--text-secondary);
}

.nav-tab:hover {
  background: rgba(0, 206, 209, 0.05);
  color: var(--text-primary);
}

.nav-tab.active {
  color: var(--accent-primary);
  background: rgba(0, 206, 209, 0.1);
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  font-size: 14px;
  font-weight: 500;
}

.tab-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--accent-primary);
  border-radius: 0 2px 2px 0;
  transition: height 0.3s;
  box-shadow: 0 0 10px var(--accent-glow);
}

.nav-tab.active .tab-indicator {
  height: 60%;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

.filter-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 10px;
}

.filter-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.clear-filter-btn {
  background: none;
  border: none;
  color: var(--accent-primary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-filter-btn:hover {
  background: rgba(0, 206, 209, 0.1);
}

.app-filter-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.filter-item:hover {
  background: rgba(0, 206, 209, 0.05);
  color: var(--text-primary);
}

.filter-item.active {
  background: rgba(0, 206, 209, 0.12);
  color: var(--accent-primary);
}

.filter-icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.app-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-primary);
  background: rgba(0, 206, 209, 0.15);
  border-radius: 4px;
}

.filter-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.filter-count {
  font-size: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.filter-item.active .filter-count {
  color: var(--accent-primary);
}

.running-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

.status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.version {
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.active-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: rgba(0, 206, 209, 0.08);
  border: 1px solid rgba(0, 206, 209, 0.25);
  border-radius: 10px;
  margin-bottom: 20px;
  animation: slide-up 0.3s ease-out;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.banner-icon {
  font-size: 18px;
}

.banner-content strong {
  color: var(--accent-primary);
  font-weight: 600;
}

.banner-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.banner-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.banner-close:hover {
  background: rgba(0, 206, 209, 0.15);
  color: var(--accent-primary);
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
  flex: 1;
}

.grid-row {
  display: flex;
  gap: 24px;
}

.row-1 {
  flex: 0 0 auto;
}

.row-2 {
  flex: 1;
  min-height: 0;
}

.col {
  flex: 1;
  min-width: 0;
}

.col-left {
  flex: 0 0 40%;
}

.col-right {
  flex: 1;
}

@media (max-width: 1200px) {
  .row-2 {
    flex-direction: column;
  }
  
  .col-left {
    flex: 0 0 auto;
  }
}

@media (max-width: 1000px) {
  .sidebar {
    width: 180px;
  }
  
  .nav-tab {
    padding: 12px 16px;
  }
  
  .app-filter-list {
    max-height: 200px;
  }
}
</style>
