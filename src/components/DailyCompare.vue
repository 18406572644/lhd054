<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { use } from 'echarts/core'
import { LineChart, LineSeriesOption, BarChart, BarSeriesOption } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { ComposeOption } from 'echarts/core'

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

type ECOption = ComposeOption<LineSeriesOption | BarSeriesOption>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const dayRange = ref(7)
const chartType = ref<'line' | 'bar'>('line')
const dailyData = ref<Array<{ date: string; count: number }>>([])
const loading = ref(true)

onMounted(() => {
  loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

watch([dayRange, chartType], () => {
  loadData()
})

async function loadData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const data = await window.electronAPI.getDailyStats(dayRange.value)
    dailyData.value = data
  } finally {
    loading.value = false
  }
}

const chartOption = computed<ECOption>(() => {
  const dates = dailyData.value.map(d => dayjs(d.date).format('MM-DD'))
  const counts = dailyData.value.map(d => d.count)
  const avgCount = dailyData.value.length > 0 
    ? Math.round(dailyData.value.reduce((sum, d) => sum + d.count, 0) / dailyData.value.length)
    : 0
  
  const avgLine = Array(dailyData.value.length).fill(avgCount)
  
  const commonOption = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39)',
      borderColor: 'rgba(0, 206, 209, 0.3)',
      textStyle: {
        color: '#fff'
      },
      axisPointer: {
        type: chartType.value === 'line' ? 'cross' : 'shadow'
      },
      formatter: (params: any) => {
        const data = params[0]
        const avg = params[1]
        return `${data.name}<br/>按键次数: <strong style="color: #00ced1">${data.value.toLocaleString('zh-CN')}</strong><br/>平均值: <strong style="color: #f59e0b">${Math.round(avg.value)}</strong>`
      }
    },
    legend: {
      data: ['按键次数', '平均值'],
      top: 0,
      textStyle: {
        color: '#a0aec0'
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.3)'
        }
      },
      axisLabel: {
        color: '#718096',
        fontSize: 11
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#718096',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.1)'
        }
      }
    }
  }
  
  if (chartType.value === 'line') {
    return {
      ...commonOption,
      series: [
        {
        name: '按键次数',
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#00CED1' },
            { offset: 1, color: '#00B4B8' }
          ])
        },
        itemStyle: {
          color: '#00CED1',
          borderColor: '#111827',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 206, 209, 0.3)' },
            { offset: 1, color: 'rgba(0, 206, 209, 0.05)' }
          ])
        }
      },
      {
        name: '平均值',
        type: 'line',
        data: avgLine,
        lineStyle: {
          type: 'dashed',
          width: 2,
          color: '#f59e0b'
        },
        symbol: 'none',
        silent: true
      }
    ]
    }
  } else {
    return {
      ...commonOption,
      series: [
        {
          name: '按键次数',
          type: 'bar',
          data: counts.map((count, index) => ({
            value: count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 206, 209, 0.9)' },
                { offset: 1, color: 'rgba(0, 206, 209, 0.3)' }
              ]),
              borderRadius: [6, 6, 0, 0]
            }
          })),
          barWidth: '50%'
        },
        {
          name: '平均值',
          type: 'line',
          data: avgLine,
          lineStyle: {
            type: 'dashed',
            width: 2,
            color: '#f59e0b'
          },
          symbol: 'none',
          silent: true
        }
      ]
    }
  }
})

const stats = computed(() => {
  const data = dailyData.value
  if (data.length === 0) {
    return { total: 0, avg: 0, max: 0, trend: 0 }
  }
  
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const avg = Math.round(total / data.length)
  const max = Math.max(...data.map(d => d.count))
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2))
  const secondHalf = data.slice(Math.floor(data.length / 2))
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / (firstHalf.length || 1)
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / (secondHalf.length || 1)
  const trend = firstAvg === 0 ? 0 : Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
  
  return { total, avg, max, trend }
})

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}
</script>

<template>
  <div class="daily-compare">
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-label">周期总计</div>
        <div class="stat-value">{{ formatNumber(stats.total) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">日均按键</div>
        <div class="stat-value">{{ formatNumber(stats.avg) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">峰值</div>
        <div class="stat-value accent">{{ formatNumber(stats.max) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">趋势</div>
        <div class="stat-value" :class="stats.trend >= 0 ? 'up' : 'down'">
          {{ stats.trend >= 0 ? '+' : '' }}{{ stats.trend }}%
        </div>
      </div>
    </div>
    
    <div class="chart-card">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">📈</span>
          每日数据对比
        </h3>
        <div class="header-controls">
          <a-radio-group v-model="dayRange" type="button">
            <a-radio :value="7">近7天</a-radio>
            <a-radio :value="14">近14天</a-radio>
            <a-radio :value="30">近30天</a-radio>
          </a-radio-group>
          <a-radio-group v-model="chartType" type="button">
            <a-radio value="line">折线图</a-radio>
            <a-radio value="bar">柱状图</a-radio>
          </a-radio-group>
        </div>
      </div>
      
      <div class="chart-container" v-if="!loading">
        <v-chart :option="chartOption" autoresize />
        <div class="empty-overlay" v-if="stats.total === 0">
          <div class="empty-icon">📊</div>
          <div class="empty-text">暂无历史按键数据</div>
          <div class="empty-hint">开始打字累计数据后即可查看对比</div>
        </div>
      </div>
      
      <div class="empty-state" v-else>
        <div class="empty-icon">⏳</div>
        <div class="empty-text">加载中...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.daily-compare {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.stat-item:hover {
  border-color: var(--border-hover);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  background: linear-gradient(135deg, var(--accent-primary), #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.accent {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.up {
  background: linear-gradient(135deg, var(--success), #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.down {
  background: linear-gradient(135deg, var(--danger), #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chart-card {
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

.header-controls {
  display: flex;
  gap: 12px;
}

.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chart-container :deep(.echarts) {
  width: 100%;
  height: 100%;
}

.empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 23, 0.85);
  backdrop-filter: blur(4px);
  z-index: 10;
  color: var(--text-tertiary);
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

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .header-controls {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
