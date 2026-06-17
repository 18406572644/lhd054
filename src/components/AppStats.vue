<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, PieSeriesOption, BarChart, BarSeriesOption } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { ComposeOption } from 'echarts/core'

use([PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

type ECOption = ComposeOption<PieSeriesOption | BarSeriesOption>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

const appData = ref<Array<{ appName: string; count: number; percentage: number }>>([])
const appKeyData = ref<Array<{ key: string; count: number; percentage: number }>>([])
const loading = ref(true)
const showLimit = ref(15)
const selectedApp = ref<string | null>(null)
const backButtonVisible = ref(false)

onMounted(() => {
  loadAppData()
})

watch(() => refreshTrigger?.value, () => {
  loadAppData()
  if (selectedApp.value) {
    loadAppKeyData(selectedApp.value)
  }
})

watch(() => selectedAppFilter.value, (newVal) => {
  if (newVal && newVal !== 'all') {
    selectedApp.value = newVal
    backButtonVisible.value = true
    loadAppKeyData(newVal)
  } else {
    selectedApp.value = null
    backButtonVisible.value = false
    loadAppData()
  }
})

watch(showLimit, () => {
  loadAppData()
})

async function loadAppData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const data = await window.electronAPI.getAppStats(50)
    appData.value = data
  } finally {
    loading.value = false
  }
}

async function loadAppKeyData(appName: string) {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const data = await window.electronAPI.getAppKeyFrequency(appName, 30)
    appKeyData.value = data
  } finally {
    loading.value = false
  }
}

function selectApp(appName: string) {
  selectedApp.value = appName
  backButtonVisible.value = true
  loadAppKeyData(appName)
}

function goBack() {
  selectedApp.value = null
  backButtonVisible.value = false
  appKeyData.value = []
  loadAppData()
}

const pieOption = computed<ECOption>(() => {
  const total = appData.value.slice(0, showLimit.value)
  const otherCount = appData.value.slice(showLimit.value).reduce((sum, a) => sum + a.count, 0)
  const otherPercent = appData.value.slice(showLimit.value).reduce((sum, a) => sum + a.percentage, 0)
  
  const pieData = total.map(a => ({
    name: a.appName,
    value: a.count,
    percentage: a.percentage
  }))
  
  if (otherCount > 0) {
    pieData.push({
      name: '其他',
      value: otherCount,
      percentage: Math.round(otherPercent * 100) / 100
    })
  }
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 24, 39)',
      borderColor: 'rgba(0, 206, 209, 0.3)',
      textStyle: {
        color: '#fff'
      },
      formatter: (params: any) => {
        return `${params.name}<br/>按键次数: <strong style="color: #00ced1">${params.value.toLocaleString('zh-CN')}</strong><br/>占比: <strong>${params.data.percentage}%</strong>`
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#a0aec0',
        fontSize: 12
      },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 8,
      type: 'scroll',
      pageTextStyle: { color: '#a0aec0' }
    },
    series: [
      {
        name: '应用统计',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#111827',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#fff'
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 206, 209, 0.5)'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData,
        color: generateColors(pieData.length)
      }
    ]
  }
})

const barOption = computed<ECOption>(() => {
  const data = appKeyData.value.slice(0, 20)
  const categories = data.map(k => k.key)
  const values = data.map(k => k.count)
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39)',
      borderColor: 'rgba(0, 206, 209, 0.3)',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = data[p.dataIndex]
        return `${p.name}<br/>次数: <strong style="color: #00ced1">${p.value.toLocaleString('zh-CN')}</strong><br/>占比: <strong>${item.percentage}%</strong>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(0, 206, 209, 0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#718096' }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: 'rgba(0, 206, 209, 0.2)' } },
      axisLabel: { color: '#a0aec0', fontFamily: 'Consolas, Monaco, monospace' },
      inverse: true
    },
    series: [
      {
        name: '按键次数',
        type: 'bar',
        data: values,
        barWidth: '60%',
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#00ced1' },
            { offset: 1, color: '#00b4b8' }
          ])
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 206, 209, 0.5)'
          }
        },
        label: {
          show: true,
          position: 'right',
          color: '#a0aec0',
          fontSize: 11,
          formatter: (p: any) => {
            const item = data[p.dataIndex]
            return `${item.percentage}%`
          }
        }
      }
    ]
  }
})

function generateColors(count: number): string[] {
  const baseColors = [
    '#00CED1', '#00B4B8', '#009999', '#20B2AA', '#48D1CC', 
    '#40E0D0', '#7FFFD4', '#00FFFF', '#1ABC9C', '#16A085',
    '#3498DB', '#2980B9', '#9B59B6', '#8E44AD', '#E91E63',
    '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39'
  ]
  
  return Array.from({ length: count }, (_, i) => {
    if (i === count - 1 && appData.value.length > showLimit.value) {
      return '#4A5568'
    }
    return baseColors[i % baseColors.length]
  })
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const totalCount = computed(() => appData.value.reduce((sum: number, a: { count: number }) => sum + a.count, 0))
const selectedAppTotal = computed(() => appKeyData.value.reduce((sum: number, k: { count: number }) => sum + k.count, 0))
const selectedAppColor = computed(() => {
  const idx = appData.value.findIndex(a => a.appName === selectedApp.value)
  const colors = generateColors(Math.min(appData.value.length, showLimit.value))
  return idx >= 0 ? colors[idx % colors.length] : '#00CED1'
})
</script>

<template>
  <div class="app-stats">
    <div v-if="!selectedApp" class="overview-view">
      <div class="chart-section">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">📊</span>
            各应用按键占比
          </h3>
          <div class="header-controls">
            <a-select v-model="showLimit" style="width: 120px">
              <a-option :value="10">Top 10</a-option>
              <a-option :value="15">Top 15</a-option>
              <a-option :value="20">Top 20</a-option>
              <a-option :value="30">Top 30</a-option>
            </a-select>
          </div>
        </div>
        
        <div class="chart-wrapper" v-if="!loading && appData.length > 0">
          <v-chart :option="pieOption" autoresize @click="(params: any) => params.data?.name && params.data.name !== '其他' && selectApp(params.data.name)" />
        </div>
        
        <div class="empty-state" v-else-if="!loading && appData.length === 0">
          <div class="empty-icon">💻</div>
          <div class="empty-text">暂无应用数据</div>
          <div class="empty-hint">在不同应用中打字即可开始统计</div>
        </div>
        
        <div class="empty-state" v-else>
          <div class="empty-icon">⏳</div>
          <div class="empty-text">加载中...</div>
        </div>
      </div>
      
      <div class="ranking-section">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">🏆</span>
            应用排行榜
          </h3>
          <div class="total-info">
            <span class="total-label">总计按键</span>
            <span class="total-value">{{ formatNumber(totalCount) }}</span>
          </div>
        </div>
        
        <div class="ranking-list" v-if="!loading && appData.length > 0">
          <div 
            class="ranking-item" 
            v-for="(item, index) in appData.slice(0, 30)" 
            :key="item.appName"
            @click="selectApp(item.appName)"
          >
            <div class="rank-number" :class="{ 'top-3': index < 3 }">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="app-icon" :style="{ background: generateColors(Math.min(appData.length, showLimit))[index % 20] + '22', borderColor: generateColors(Math.min(appData.length, showLimit))[index % 20] + '44' }">
              <span class="icon-text">{{ item.appName.charAt(0) }}</span>
            </div>
            <div class="app-info">
              <div class="app-name">{{ item.appName }}</div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ 
                    width: `${Math.min(item.percentage, 100)}%`,
                    background: `linear-gradient(90deg, ${generateColors(Math.min(appData.length, showLimit))[index % 20]}, ${generateColors(Math.min(appData.length, showLimit))[(index + 3) % 20]})`
                  }">
                </div>
              </div>
            </div>
            <div class="count-value">{{ formatNumber(item.count) }}</div>
            <div class="percent-value">{{ item.percentage }}%</div>
            <div class="drill-arrow">→</div>
          </div>
        </div>
        
        <div class="empty-state small" v-else-if="!loading && appData.length === 0">
          <div class="empty-text">暂无应用数据</div>
          <div class="empty-hint">开始在不同应用中打字</div>
        </div>
        
        <div class="empty-state small" v-else>
          <div class="empty-text">加载中...</div>
        </div>
      </div>
    </div>
    
    <div v-else class="detail-view">
      <div class="detail-header">
        <button class="back-button" @click="goBack">
          <span class="back-arrow">←</span>
          <span>返回应用列表</span>
        </button>
        <div class="selected-app-info">
          <div class="selected-app-icon" :style="{ background: selectedAppColor + '22', borderColor: selectedAppColor + '44' }">
            <span class="icon-text">{{ selectedApp.charAt(0) }}</span>
          </div>
          <div class="selected-app-details">
            <h2 class="selected-app-name">{{ selectedApp }}</h2>
            <div class="selected-app-stats">
              <span class="stat-item">
                <span class="stat-label">按键总数</span>
                <span class="stat-value">{{ formatNumber(selectedAppTotal) }}</span>
              </span>
              <span class="stat-item">
                <span class="stat-label">按键种类</span>
                <span class="stat-value">{{ appKeyData.length }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="detail-content">
        <div class="bar-section">
          <div class="card-header">
            <h3 class="card-title">
              <span class="title-icon">⌨️</span>
              应用内按键排行
            </h3>
          </div>
          
          <div class="chart-wrapper bar-wrapper" v-if="!loading && appKeyData.length > 0">
            <v-chart :option="barOption" autoresize />
          </div>
          
          <div class="empty-state" v-else-if="!loading && appKeyData.length === 0">
            <div class="empty-icon">⌨️</div>
            <div class="empty-text">该应用暂无按键数据</div>
          </div>
          
          <div class="empty-state" v-else>
            <div class="empty-icon">⏳</div>
            <div class="empty-text">加载中...</div>
          </div>
        </div>
        
        <div class="key-list-section">
          <div class="card-header">
            <h3 class="card-title">
              <span class="title-icon">📋</span>
              按键明细
            </h3>
          </div>
          
          <div class="key-list" v-if="!loading && appKeyData.length > 0">
            <div 
              class="key-item" 
              v-for="(item, index) in appKeyData" 
              :key="item.key"
            >
              <div class="key-rank">{{ index + 1 }}</div>
              <div class="key-label">{{ item.key }}</div>
              <div class="key-progress">
                <div 
                  class="key-progress-fill"
                  :style="{ 
                    width: `${Math.min(item.percentage * 2, 100)}%`,
                    background: selectedAppColor
                  }">
                </div>
              </div>
              <div class="key-count">{{ formatNumber(item.count) }}</div>
              <div class="key-percent">{{ item.percentage }}%</div>
            </div>
          </div>
          
          <div class="empty-state small" v-else-if="!loading && appKeyData.length === 0">
            <div class="empty-text">暂无数据</div>
          </div>
          
          <div class="empty-state small" v-else>
            <div class="empty-text">加载中...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-stats {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.overview-view {
  display: flex;
  gap: 24px;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.chart-section {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  min-height: 0;
}

.ranking-section {
  width: 520px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
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

.header-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.total-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.total-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--accent-primary);
}

.chart-wrapper {
  flex: 1;
  min-height: 0;
}

.chart-wrapper :deep(.echarts) {
  width: 100%;
  height: 100%;
}

.bar-wrapper {
  min-height: 400px;
}

.ranking-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.ranking-item:hover {
  background: rgba(0, 206, 209, 0.05);
  border-color: var(--border-color);
  transform: translateX(2px);
}

.rank-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: 6px;
  flex-shrink: 0;
}

.rank-number.top-3 {
  background: transparent;
  font-size: 18px;
}

.app-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid;
  flex-shrink: 0;
}

.icon-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary);
}

.app-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease-out;
}

.count-value {
  min-width: 80px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.percent-value {
  min-width: 55px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.drill-arrow {
  color: var(--text-tertiary);
  font-size: 14px;
  opacity: 0.5;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ranking-item:hover .drill-arrow {
  opacity: 1;
  color: var(--accent-primary);
  transform: translateX(2px);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.empty-state.small {
  flex: 1;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-shrink: 0;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(0, 206, 209, 0.05);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.back-arrow {
  font-size: 14px;
  font-weight: bold;
}

.selected-app-info {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 24px;
  backdrop-filter: blur(10px);
  flex: 1;
  max-width: 600px;
}

.selected-app-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px solid;
  flex-shrink: 0;
}

.selected-app-icon .icon-text {
  font-size: 20px;
}

.selected-app-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.selected-app-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.selected-app-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--accent-primary);
}

.detail-content {
  display: flex;
  gap: 24px;
  flex: 1;
  min-height: 0;
}

.bar-section {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  min-height: 0;
}

.key-list-section {
  width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  min-height: 0;
}

.key-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.2s;
}

.key-item:hover {
  background: rgba(0, 206, 209, 0.03);
  border-color: var(--border-color);
}

.key-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: 4px;
  flex-shrink: 0;
}

.key-label {
  min-width: 60px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.key-progress {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  min-width: 0;
}

.key-progress-fill {
  height: 100%;
  border-radius: 3px;
  opacity: 0.8;
  transition: width 0.5s ease-out;
}

.key-count {
  min-width: 70px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.key-percent {
  min-width: 50px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

@media (max-width: 1400px) {
  .overview-view {
    flex-direction: column;
  }
  
  .ranking-section {
    width: 100%;
    max-height: 450px;
  }
  
  .detail-content {
    flex-direction: column;
  }
  
  .key-list-section {
    width: 100%;
    max-height: 400px;
  }
}

@media (max-width: 900px) {
  .detail-header {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  
  .selected-app-info {
    max-width: 100%;
  }
}
</style>
