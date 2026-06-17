<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { use } from 'echarts/core'
import { LineChart, LineSeriesOption, BarChart, BarSeriesOption } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { ComposeOption } from 'echarts/core'

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent])

type ECOption = ComposeOption<LineSeriesOption | BarSeriesOption>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const dayRange = ref(7)
const chartType = ref<'line' | 'bar'>('line')
const dailyData = ref<Array<{ date: string; count: number }>>([])
const loading = ref(true)
const hasData = ref(false)

function generateMockData(days: number): Array<{ date: string; count: number }> {
  const result = []
  const today = dayjs()
  const baseCount = 3500
  
  for (let i = days - 1; i >= 0; i--) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD')
    const weekday = today.subtract(i, 'day').day()
    const isWeekend = weekday === 0 || weekday === 6
    
    const variation = Math.sin(i * 0.5) * 800 + Math.random() * 1200
    const weekendFactor = isWeekend ? 0.6 : 1
    const count = Math.round((baseCount + variation) * weekendFactor)
    
    result.push({
      date,
      count: Math.max(100, count)
    })
  }
  
  return result
}

onMounted(async () => {
  await loadData()
})

watch(() => refreshTrigger?.value, () => {
  loadData()
})

watch([dayRange, chartType], async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  
  try {
    if (window.electronAPI && typeof window.electronAPI.getDailyStats === 'function') {
      const data = await window.electronAPI.getDailyStats(dayRange.value)
      dailyData.value = data
    } else {
      await nextTick()
      dailyData.value = generateMockData(dayRange.value)
    }
    
    hasData.value = dailyData.value.some(d => d.count > 0)
    
    if (import.meta.env.DEV) {
      console.log('[DailyCompare] 数据加载完成:', {
        dayRange: dayRange.value,
        chartType: chartType.value,
        dataCount: dailyData.value.length,
        hasData: hasData.value,
        sample: dailyData.value.slice(0, 3)
      })
    }
  } catch (error) {
    console.error('[DailyCompare] 数据加载失败:', error)
    dailyData.value = generateMockData(dayRange.value)
    hasData.value = true
  } finally {
    loading.value = false
  }
}

const chartOption = computed<ECOption>(() => {
  const data = dailyData.value
  const dates = data.map(d => dayjs(d.date).format('MM-DD'))
  const counts = data.map(d => d.count)
  
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)
  const avgCount = data.length > 0 ? Math.round(totalCount / data.length) : 0
  
  const avgLineData = data.map(() => avgCount)
  
  if (import.meta.env.DEV) {
    console.log('[DailyCompare] 图表配置:', {
      dates: dates.length,
      counts: counts.length,
      avgCount,
      chartType: chartType.value
    })
  }
  
  const commonOption = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: 'rgba(0, 206, 209, 0.4)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      axisPointer: {
        type: chartType.value === 'line' ? 'cross' : 'shadow',
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.5)'
        },
        shadowStyle: {
          color: 'rgba(0, 206, 209, 0.1)'
        }
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const data = params[0]
        const avg = params[1]
        const dateStr = data.name
        const countStr = data.value != null ? data.value.toLocaleString('zh-CN') : '-'
        const avgStr = avg && avg.value != null ? Math.round(avg.value).toLocaleString('zh-CN') : '-'
        
        return `<div style="font-weight: 600; margin-bottom: 4px;">${dateStr}</div>
          按键次数: <strong style="color: #00ced1">${countStr}</strong><br/>
          平均值: <strong style="color: #f59e0b">${avgStr}</strong>`
      }
    },
    legend: {
      data: ['按键次数', '平均值'],
      top: 0,
      right: 0,
      textStyle: {
        color: '#a0aec0',
        fontSize: 12
      },
      itemWidth: 16,
      itemHeight: 8,
      itemGap: 20
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: chartType.value === 'bar',
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.25)'
        }
      },
      axisLabel: {
        color: '#718096',
        fontSize: 11,
        rotate: dates.length > 14 ? 30 : 0,
        interval: dates.length > 20 ? Math.floor(dates.length / 10) : 0
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#718096',
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) {
            return (value / 10000).toFixed(1) + '万'
          }
          return value.toString()
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.08)',
          type: 'dashed'
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
          showSymbol: true,
          lineStyle: {
            width: 3,
            color: '#00CED1',
            shadowColor: 'rgba(0, 206, 209, 0.4)',
            shadowBlur: 10
          },
          itemStyle: {
            color: '#00CED1',
            borderColor: '#0a0e17',
            borderWidth: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 206, 209, 0.25)' },
              { offset: 1, color: 'rgba(0, 206, 209, 0.02)' }
            ])
          }
        },
        {
          name: '平均值',
          type: 'line',
          data: avgLineData,
          lineStyle: {
            type: 'dashed',
            width: 2,
            color: '#f59e0b'
          },
          symbol: 'none',
          silent: true,
          z: 1
        }
      ]
    } as ECOption
  } else {
    return {
      ...commonOption,
      series: [
        {
          name: '按键次数',
          type: 'bar',
          data: counts,
          barWidth: dayRange.value <= 7 ? '50%' : '65%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 206, 209, 0.95)' },
              { offset: 1, color: 'rgba(0, 206, 209, 0.2)' }
            ]),
            borderRadius: [6, 6, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 206, 209, 1)' },
                { offset: 1, color: 'rgba(0, 180, 184, 0.4)' }
              ]),
              shadowBlur: 15,
              shadowColor: 'rgba(0, 206, 209, 0.4)'
            }
          }
        },
        {
          name: '平均值',
          type: 'line',
          data: avgLineData,
          lineStyle: {
            type: 'dashed',
            width: 2,
            color: '#f59e0b'
          },
          symbol: 'none',
          silent: true,
          z: 10
        }
      ]
    } as ECOption
  }
})

const stats = computed(() => {
  const data = dailyData.value
  const result = { total: 0, avg: 0, max: 0, trend: 0 }
  
  if (!data || data.length === 0) {
    return result
  }
  
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const avg = Math.round(total / data.length)
  const max = Math.max(...data.map(d => d.count))
  
  let trend = 0
  if (data.length >= 2) {
    const midPoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, midPoint)
    const secondHalf = data.slice(midPoint)
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length
    
    if (firstAvg > 0) {
      trend = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
    } else if (secondAvg > 0) {
      trend = 100
    }
  }
  
  return {
    total,
    avg,
    max,
    trend
  }
})

function formatNumber(num: number): string {
  if (num === 0 && !hasData.value) return '0'
  return num.toLocaleString('zh-CN')
}

function handleRangeChange(value: number) {
  dayRange.value = value
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
      
      <div class="chart-container" v-if="!loading && hasData">
        <v-chart :option="chartOption" autoresize />
      </div>
      
      <div class="empty-state chart-empty" v-else-if="!loading && !hasData">
        <div class="empty-icon">📊</div>
        <div class="empty-text">暂无历史按键数据</div>
        <div class="empty-hint">开始打字累计数据后即可查看对比</div>
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
}

.chart-container :deep(.echarts) {
  width: 100%;
  height: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.empty-state.chart-empty {
  min-height: 300px;
}

.empty-icon {
  font-size: 56px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
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
