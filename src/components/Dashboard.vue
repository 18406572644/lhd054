<script setup lang="ts">
import { ref, inject, watch, Ref } from 'vue'
import TodayStats from './TodayStats.vue'
import KeyFrequency from './KeyFrequency.vue'
import FrequentKeys from './FrequentKeys.vue'
import DailyCompare from './DailyCompare.vue'
import HourlyChart from './HourlyChart.vue'
import ExportPanel from './ExportPanel.vue'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const activeTab = ref('overview')

const tabs = [
  { key: 'overview', label: '总览', icon: '📊' },
  { key: 'frequency', label: '按键频率', icon: '📈' },
  { key: 'compare', label: '数据对比', icon: '📉' },
  { key: 'export', label: '导出数据', icon: '📥' }
]

watch(activeTab, () => {
  // Tab切换时App.vue会更新refreshTrigger
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
        <div class="running-status">
          <span class="status-dot"></span>
          <span class="status-text">后台运行中</span>
        </div>
        <div class="version">v1.0.0</div>
      </div>
    </div>
    
    <div class="main-content">
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
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.running-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
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
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
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
</style>
