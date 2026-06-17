<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { use } from 'echarts/core'
import { BarChart, BarSeriesOption } from 'echarts/charts'
import { GridComponent, TooltipComponent, GridComponentOption, TooltipComponentOption } from 'echarts/components'
import { ComposeOption } from 'echarts/core'

use([BarChart, GridComponent, TooltipComponent])

type ECOption = ComposeOption<GridComponentOption | TooltipComponentOption | BarSeriesOption>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')
const selectedAppFilter = inject<Ref<string>>('selectedAppFilter') as Ref<string>

const hourlyData = ref<Array<{ hour: number; count: number }>>([])
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const loading = ref(true)

onMounted(() => {
  loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

watch(selectedDate, () => {
  loadData()
})

async function loadData() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    const appName = selectedAppFilter.value !== 'all' ? selectedAppFilter.value : undefined
    const data = await window.electronAPI.getHourlyStats(selectedDate.value, appName)
    hourlyData.value = data
  } finally {
    loading.value = false
  }
}

const chartOption = computed<ECOption>(() => {
  const hours = hourlyData.value.map(d => `${d.hour.toString().padStart(2, '0')}:00`)
  const counts = hourlyData.value.map(d => d.count)
  const maxCount = Math.max(...counts, 1)
  
  return {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
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
        type: 'shadow'
      },
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>按键次数: <strong style="color: #00ced1">${data.value}</strong>`
      }
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.3)'
        }
      },
      axisLabel: {
        color: '#718096',
        fontSize: 11,
        interval: 2
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
    },
    series: [
      {
        type: 'bar',
        data: counts.map((count, index) => ({
          value: count,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 206, 209, 0.9)' },
              { offset: 1, color: 'rgba(0, 206, 209, 0.3)' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barWidth: '60%',
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 206, 209, 1)' },
              { offset: 1, color: 'rgba(0, 180, 184, 0.5)' }
            ])
          }
        }
      }
    ]
  }
})

const totalToday = computed(() => hourlyData.value.reduce((sum: number, d: { hour: number; count: number }) => sum + d.count, 0))
const peakHour = computed(() => {
  const max = Math.max(...hourlyData.value.map(d => d.count), 0)
  const peak = hourlyData.value.find(d => d.count === max)
  return peak ? `${peak.hour.toString().padStart(2, '0')}:00` : '-'
})
</script>

<template>
  <div class="hourly-chart">
    <div class="card-header">
      <h3 class="card-title">
        <span class="title-icon">⏰</span>
        24小时分布
      </h3>
      <div class="header-right">
        <div class="stat-mini">
        <span class="stat-label">今日总计</span>
        <span class="stat-value">{{ totalToday.toLocaleString('zh-CN') }}</span>
      </div>
      <div class="stat-mini">
        <span class="stat-label">高峰时段</span>
        <span class="stat-value accent">{{ peakHour }}</span>
      </div>
        <a-date-picker
          v-model="selectedDate"
          style="width: 140px"
          :allow-clear="true"
          format="YYYY-MM-DD"
        />
      </div>
    </div>
    
    <div class="chart-container" v-if="!loading">
      <v-chart :option="chartOption" autoresize />
      <div class="empty-overlay" v-if="totalToday === 0">
        <div class="empty-icon">📊</div>
        <div class="empty-text">今日暂无按键数据</div>
        <div class="empty-hint">开始打字即可查看24小时分布</div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <div class="empty-icon">⏳</div>
      <div class="empty-text">加载中...</div>
    </div>
  </div>
</template>

<style scoped>
.hourly-chart {
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
  margin-bottom: 16px;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--text-primary);
}

.stat-value.accent {
  color: var(--accent-primary);
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
</style>
