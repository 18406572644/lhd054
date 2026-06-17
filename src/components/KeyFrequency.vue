<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, PieSeriesOption } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { ComposeOption } from 'echarts/core'

use([PieChart, TitleComponent, TooltipComponent, LegendComponent])

type ECOption = ComposeOption<PieSeriesOption>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

const keyData = ref<Array<{ key: string; count: number; percentage: number }>>([])
const loading = ref(true)
const showLimit = ref(15)

onMounted(() => {
  loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

watch(showLimit, () => {
  loadData()
})

async function loadData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const appName = selectedAppFilter.value !== 'all' ? selectedAppFilter.value : undefined
    const data = await window.electronAPI.getKeyFrequency(showLimit.value, appName)
    keyData.value = data
  } finally {
    loading.value = false
  }
}

const pieOption = computed<ECOption>(() => {
  const total = keyData.value.slice(0, showLimit.value)
  const otherCount = keyData.value.slice(showLimit.value).reduce((sum, k) => sum + k.count, 0)
  const otherPercent = keyData.value.slice(showLimit.value).reduce((sum, k) => sum + k.percentage, 0)
  
  const pieData = total.map(k => ({
    name: k.key,
    value: k.count,
    percentage: k.percentage
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
        return `${params.name}<br/>次数: <strong style="color: #00ced1">${params.value.toLocaleString('zh-CN')}</strong><br/>占比: <strong>${params.data.percentage}%</strong>`
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
      itemGap: 8
    },
    series: [
      {
        name: '按键频率',
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

function generateColors(count: number): string[] {
  const baseColors = [
    '#00CED1', '#00B4B8', '#009999', '#20B2AA', '#48D1CC', '#40E0D0', '#7FFFD4',
    '#00FFFF', '#00CED1', '#00B4B8', '#009999', '#20B2AA', '#48D1CC', '#40E0D0', '#7FFFD4'
  ]
  
  return Array.from({ length: count }, (_, i) => {
    if (i === count - 1 && keyData.value.length > showLimit.value) {
      return '#4A5568'
    }
    return baseColors[i % baseColors.length]
  })
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const totalCount = computed(() => keyData.value.reduce((sum: number, k: { key: string; count: number; percentage: number }) => sum + k.count, 0))
</script>

<template>
  <div class="key-frequency">
    <div class="frequency-content">
      <div class="chart-section">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">🥧</span>
            按键频率分布
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
        
        <div class="chart-wrapper" v-if="!loading && keyData.length > 0">
        <v-chart :option="pieOption" autoresize />
      </div>
      
      <div class="empty-state" v-else-if="!loading && keyData.length === 0">
        <div class="empty-icon">📊</div>
        <div class="empty-text">暂无按键数据</div>
        <div class="empty-hint">开始打字即可统计按键频率</div>
      </div>
      
      <div class="empty-state" v-else>
        <div class="empty-icon">⏳</div>
        <div class="empty-text">加载中...</div>
      </div>
      </div>
    </div>
    
    <div class="ranking-section">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">🏆</span>
          排行榜
        </h3>
        <div class="total-info">
          <span class="total-label">总计按键</span>
          <span class="total-value">{{ formatNumber(totalCount) }}</span>
        </div>
      </div>
      
      <div class="ranking-list" v-if="!loading && keyData.length > 0">
        <div class="ranking-item" v-for="(item, index) in keyData.slice(0, 20)" :key="item.key">
          <div class="rank-number" :class="{ 'top-3': index < 3 }">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="key-label">{{ item.key }}</div>
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: `${Math.min(item.percentage, 100)}%` }">
            </div>
          </div>
          <div class="count-value">{{ formatNumber(item.count) }}</div>
          <div class="percent-value">{{ item.percentage }}%</div>
        </div>
      </div>
      
      <div class="empty-state small" v-else-if="!loading && keyData.length === 0">
        <div class="empty-text">暂无按键数据</div>
        <div class="empty-hint">开始打字即可查看排行</div>
      </div>
      
      <div class="empty-state small" v-else>
        <div class="empty-text">加载中...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.key-frequency {
  display: flex;
  gap: 24px;
  height: 100%;
}

.frequency-content {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}

.ranking-section {
  width: 450px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
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

.ranking-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
}

.ranking-item:hover {
  background: rgba(0, 206, 209, 0.05);
  border-color: var(--border-color);
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
}

.rank-number.top-3 {
  background: transparent;
  font-size: 18px;
}

.key-label {
  min-width: 70px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 4px;
  transition: width 0.5s ease-out;
}

.count-value {
  min-width: 70px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.percent-value {
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

@media (max-width: 1200px) {
  .key-frequency {
    flex-direction: column;
  }
  
  .ranking-section {
    width: 100%;
    max-height: 400px;
  }
}
</style>
