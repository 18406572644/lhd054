<script setup lang="ts">
import { ref, onMounted, inject, watch, Ref } from 'vue'
import dayjs from 'dayjs'

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const stats = ref({
  today: 0,
  yesterday: 0,
  weekAvg: 0,
  maxDay: { date: '', count: 0 }
})

onMounted(() => {
  loadStats()
})

watch(() => refreshTrigger?.value, () => {
  loadStats()
})

async function loadStats() {
  if (!window.electronAPI) return
  
  const todayDate = dayjs().format('YYYY-MM-DD')
  const yesterdayDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  
  const dailyStats = await window.electronAPI.getDailyStats(7)
  const todayStats = dailyStats.find(d => d.date === todayDate)
  const yesterdayStats = dailyStats.find(d => d.date === yesterdayDate)
  
  const weekTotal = dailyStats.reduce((sum, d) => sum + d.count, 0)
  
  const maxDay = dailyStats.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 })
  
  stats.value = {
    today: todayStats?.count || 0,
    yesterday: yesterdayStats?.count || 0,
    weekAvg: Math.round(weekTotal / 7),
    maxDay
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

function getChangePercent(current: number, previous: number): { value: string; isPositive: boolean } {
  if (previous === 0) return { value: '+0%', isPositive: true }
  const percent = ((current - previous) / previous * 100).toFixed(1)
  const isPositive = current >= previous
  return { value: `${isPositive ? '+' : ''}${percent}%`, isPositive }
}
</script>

<template>
  <div class="stats-container">
    <div class="stat-card main-card">
      <div class="card-glow"></div>
      <div class="card-content">
        <div class="card-icon">📊</div>
        <div class="card-info">
          <div class="card-title">今日按键</div>
          <div class="card-value" :key="stats.today">{{ formatNumber(stats.today) }}</div>
          <div class="card-subtitle">
            <span :class="getChangePercent(stats.today, stats.yesterday).isPositive ? 'up' : 'down'">
              {{ getChangePercent(stats.today, stats.yesterday).value }}
            </span>
            <span class="compare-text">较昨日</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="card-content">
        <div class="card-icon small">📅</div>
        <div class="card-info">
          <div class="card-title">昨日按键</div>
          <div class="card-value small">{{ formatNumber(stats.yesterday) }}</div>
        </div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="card-content">
        <div class="card-icon small">📈</div>
        <div class="card-info">
          <div class="card-title">周均按键</div>
          <div class="card-value small">{{ formatNumber(stats.weekAvg) }}</div>
        </div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="card-content">
        <div class="card-icon small">🏆</div>
        <div class="card-info">
          <div class="card-title">最高记录</div>
          <div class="card-value small">{{ formatNumber(stats.maxDay.count) }}</div>
          <div class="card-date">{{ stats.maxDay.date || '-' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 20px;
}

.stat-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.main-card {
  background: linear-gradient(135deg, rgba(0, 206, 209, 0.1) 0%, var(--bg-card) 100%);
}

.card-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 206, 209, 0.15) 0%, transparent 60%);
  pointer-events: none;
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1;
}

.card-icon {
  font-size: 48px;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 206, 209, 0.1);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.card-icon.small {
  font-size: 32px;
  width: 56px;
  height: 56px;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-value {
  font-size: 36px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  background: linear-gradient(135deg, var(--accent-primary), #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: count-up 0.3s ease-out;
}

.card-value.small {
  font-size: 28px;
}

.card-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.card-subtitle .up {
  color: var(--success);
  font-weight: 600;
}

.card-subtitle .down {
  color: var(--danger);
  font-weight: 600;
}

.compare-text {
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-date {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

@media (max-width: 1200px) {
  .stats-container {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: 1fr;
  }
}
</style>
