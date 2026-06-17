<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Dashboard from './components/Dashboard.vue'

const todayCount = ref(0)
const lastKey = ref('')
const lastApp = ref('')

const refreshData = ref(0)
const selectedAppFilter = ref('all')

provide('refreshTrigger', refreshData)
provide('selectedAppFilter', selectedAppFilter)

onMounted(() => {
  loadTodayStats()
  
  if (window.electronAPI?.onKeyPress) {
    window.electronAPI.onKeyPress((key: string, count: number, appName?: string) => {
      todayCount.value = count
      lastKey.value = key
      if (appName) {
        lastApp.value = appName
      }
      refreshData.value++
    })
  }
})

async function loadTodayStats() {
  if (window.electronAPI?.getTodayStats) {
    const stats = await window.electronAPI.getTodayStats()
    todayCount.value = stats.total
  }
}
</script>

<template>
  <div class="app-container">
    <TitleBar :today-count="todayCount" :last-key="lastKey" :last-app="lastApp" />
    <Dashboard />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(0, 206, 209, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(0, 206, 209, 0.05) 0%, transparent 40%),
    linear-gradient(180deg, rgba(0, 206, 209, 0.02) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

.app-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(0, 206, 209, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 206, 209, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}
</style>
