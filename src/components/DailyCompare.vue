<script setup lang="ts">
import { ref, onMounted, inject, watch, computed, Ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { Message } from '@arco-design/web-vue'
import { use } from 'echarts/core'
import {
  RadarChart,
  RadarSeriesOption,
  BarChart,
  BarSeriesOption,
  LineChart,
  LineSeriesOption
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  RadarComponentOption,
  TitleComponent,
  ToolboxComponent
} from 'echarts/components'
import { ComposeOption } from 'echarts/core'
import type { DayMultiDimData } from '../env.d'

use([
  RadarChart,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  ToolboxComponent
])

type ECOption = ComposeOption<
  RadarSeriesOption | BarSeriesOption | LineSeriesOption | RadarComponentOption
>

const refreshTrigger = inject<Ref<number>>('refreshTrigger')

const viewMode = ref<'quick' | 'custom'>('quick')
const dayRange = ref(7)
const selectedDates = ref<string[]>([])
const multiDimData = ref<DayMultiDimData[]>([])
const loading = ref(true)
const exporting = ref(false)
const radarChartRef = ref()
const hourlyChartRef = ref()
const reportRef = ref<HTMLElement>()
const calendarValue = ref<string[]>([])

const COLOR_PALETTE = [
  '#00CED1',
  '#FF6B6B',
  '#4ECDC4',
  '#FFD93D',
  '#95E1D3',
  '#F38181',
  '#AA96DA',
  '#FCBAD3'
]

interface RadarDimension {
  key: keyof Pick<DayMultiDimData, 'totalCount' | 'peakHour' | 'letterRatio' | 'modifierRatio' | 'backspaceRatio'>
  label: string
  unit: string
  maxValue: number
  normalize: (v: number, data: DayMultiDimData) => number
}

const RADAR_DIMENSIONS: RadarDimension[] = [
  {
    key: 'totalCount',
    label: '总按键量',
    unit: '次',
    maxValue: 100,
    normalize: (v: number, _d: DayMultiDimData) => v
  },
  {
    key: 'peakHour',
    label: '峰值时段活跃度',
    unit: '%',
    maxValue: 100,
    normalize: (_v: number, d: DayMultiDimData) => {
      const peakCount = d.hourlyData[d.peakHour]?.count || 0
      const total = d.totalCount || 1
      return Math.round((peakCount / total) * 100 * 5)
    }
  },
  {
    key: 'letterRatio',
    label: '字母占比',
    unit: '%',
    maxValue: 100,
    normalize: (v: number) => v
  },
  {
    key: 'modifierRatio',
    label: '修饰键占比',
    unit: '%',
    maxValue: 100,
    normalize: (v: number) => v * 3
  },
  {
    key: 'backspaceRatio',
    label: 'Backspace率',
    unit: '%',
    maxValue: 100,
    normalize: (v: number) => v * 5
  }
]

function generateMockMultiDimData(dates: string[]): DayMultiDimData[] {
  return dates.map((date, idx) => {
    const weekday = dayjs(date).day()
    const isWeekend = weekday === 0 || weekday === 6
    const baseCount = isWeekend ? 2200 : 4200
    const variation = Math.sin(idx * 0.8) * 900 + Math.random() * 1400
    const totalCount = Math.max(500, Math.round(baseCount + variation))

    const hourlyData: Array<{ hour: number; count: number }> = []
    let remaining = totalCount
    for (let h = 0; h < 24; h++) {
      let hourWeight = 0
      if (h >= 9 && h <= 12) hourWeight = 0.12
      else if (h >= 14 && h <= 18) hourWeight = 0.14
      else if (h >= 19 && h <= 22) hourWeight = 0.10
      else if (h >= 0 && h <= 6) hourWeight = 0.01
      else hourWeight = 0.03
      hourWeight += (Math.random() - 0.5) * 0.04

      const count = h === 23
        ? remaining
        : Math.max(0, Math.round(totalCount * hourWeight))
      hourlyData.push({ hour: h, count })
      remaining -= count
    }
    if (remaining > 0) {
      hourlyData[hourlyData.length - 1].count += remaining
    }

    let peakHour = 14
    let maxCount = 0
    hourlyData.forEach(h => {
      if (h.count > maxCount) {
        maxCount = h.count
        peakHour = h.hour
      }
    })

    const letterRatio = 55 + Math.random() * 20
    const modifierRatio = 5 + Math.random() * 8
    const backspaceRatio = isWeekend ? 6 + Math.random() * 4 : 3 + Math.random() * 3

    const safeTotal = totalCount

    return {
      date,
      totalCount: safeTotal,
      hourlyData,
      peakHour,
      letterCount: Math.round(safeTotal * letterRatio / 100),
      letterRatio: Math.round(letterRatio * 100) / 100,
      modifierCount: Math.round(safeTotal * modifierRatio / 100),
      modifierRatio: Math.round(modifierRatio * 100) / 100,
      backspaceCount: Math.round(safeTotal * backspaceRatio / 100),
      backspaceRatio: Math.round(backspaceRatio * 100) / 100
    }
  })
}

onMounted(async () => {
  if (viewMode.value === 'quick') {
    await loadQuickRangeData()
  }
})

watch(() => refreshTrigger?.value, () => {
  loadCurrentData()
})

watch([dayRange, viewMode], async () => {
  if (viewMode.value === 'quick') {
    selectedDates.value = []
    await loadQuickRangeData()
  }
})

watch(selectedDates, async (newVal) => {
  if (viewMode.value === 'custom' && newVal.length > 0) {
    await loadCustomDatesData()
  }
}, { deep: true })

async function loadQuickRangeData() {
  loading.value = true
  try {
    const dates: string[] = []
    const today = dayjs()
    for (let i = dayRange.value - 1; i >= 0; i--) {
      dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'))
    }
    selectedDates.value = dates

    if (window.electronAPI && typeof (window.electronAPI as any).getMultiDimDailyStats === 'function') {
      const data = await window.electronAPI.getMultiDimDailyStats(dates)
      multiDimData.value = data
    } else {
      await nextTick()
      multiDimData.value = generateMockMultiDimData(dates)
    }
  } catch (error) {
    console.error('[DailyCompare] 数据加载失败:', error)
    const dates: string[] = []
    const today = dayjs()
    for (let i = dayRange.value - 1; i >= 0; i--) {
      dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'))
    }
    multiDimData.value = generateMockMultiDimData(dates)
  } finally {
    loading.value = false
  }
}

async function loadCustomDatesData() {
  if (selectedDates.value.length === 0) return
  loading.value = true
  try {
    const sortedDates = [...selectedDates.value].sort((a, b) => a.localeCompare(b))
    if (window.electronAPI && typeof (window.electronAPI as any).getMultiDimDailyStats === 'function') {
      const data = await window.electronAPI.getMultiDimDailyStats(sortedDates)
      multiDimData.value = data
    } else {
      await nextTick()
      multiDimData.value = generateMockMultiDimData(sortedDates)
    }
  } catch (error) {
    console.error('[DailyCompare] 数据加载失败:', error)
    const sortedDates = [...selectedDates.value].sort((a, b) => a.localeCompare(b))
    multiDimData.value = generateMockMultiDimData(sortedDates)
  } finally {
    loading.value = false
  }
}

async function loadCurrentData() {
  if (viewMode.value === 'quick') {
    await loadQuickRangeData()
  } else if (selectedDates.value.length > 0) {
    await loadCustomDatesData()
  }
}

function onCalendarSelect(dates: string | string[]) {
  if (Array.isArray(dates)) {
    selectedDates.value = dates.filter(d => d).sort((a, b) => a.localeCompare(b))
  } else if (dates) {
    if (!selectedDates.value.includes(dates)) {
      selectedDates.value = [...selectedDates.value, dates].sort((a, b) => a.localeCompare(b))
    } else {
      selectedDates.value = selectedDates.value.filter(d => d !== dates)
    }
  }
}

function removeDate(date: string) {
  selectedDates.value = selectedDates.value.filter(d => d !== date)
  calendarValue.value = [...selectedDates.value]
}

function clearDates() {
  selectedDates.value = []
  calendarValue.value = []
  multiDimData.value = []
}

const radarOption = computed<ECOption>(() => {
  const data = multiDimData.value
  if (data.length === 0) return {} as ECOption

  let globalMaxTotal = Math.max(...data.map(d => d.totalCount), 1)
  const radarIndicators = RADAR_DIMENSIONS.map((dim, idx) => {
    if (idx === 0) {
      const maxVal = globalMaxTotal * 1.1
      return {
        name: dim.label,
        max: maxVal
      }
    }
    return {
      name: dim.label,
      max: dim.maxValue
    }
  })

  const seriesData = data.map((d, i) => {
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length]
    const values = RADAR_DIMENSIONS.map(dim => {
      if (dim.key === 'totalCount') {
        return d[dim.key]
      }
      return dim.normalize(d[dim.key], d)
    })
    return {
      name: dayjs(d.date).format('MM-DD'),
      value: values,
      itemStyle: { color },
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: color + '40' },
          { offset: 1, color: color + '10' }
        ])
      },
      symbol: 'circle',
      symbolSize: 6
    }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: 'rgba(0, 206, 209, 0.4)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params: any) => {
        if (!params || !params.name) return ''
        const idx = data.findIndex(d => dayjs(d.date).format('MM-DD') === params.name)
        if (idx === -1) return params.name
        const d = data[idx]
        return `<div style="font-weight: 600; margin-bottom: 6px; color: ${COLOR_PALETTE[idx % COLOR_PALETTE.length]}">${d.date}</div>
          总按键量: <strong>${d.totalCount.toLocaleString('zh-CN')}</strong><br/>
          峰值时段: <strong>${d.peakHour.toString().padStart(2, '0')}:00</strong><br/>
          字母占比: <strong>${d.letterRatio}%</strong><br/>
          修饰键占比: <strong>${d.modifierRatio}%</strong><br/>
          Backspace率: <strong>${d.backspaceRatio}%</strong>`
      }
    },
    legend: {
      data: data.map((d, i) => ({
        name: dayjs(d.date).format('MM-DD'),
        itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length] }
      })),
      top: 0,
      right: 0,
      textStyle: {
        color: '#a0aec0',
        fontSize: 12
      },
      itemWidth: 12,
      itemHeight: 12,
      type: 'scroll'
    },
    radar: {
      center: ['50%', '55%'],
      radius: '65%',
      indicator: radarIndicators,
      axisName: {
        color: '#a0aec0',
        fontSize: 11,
        fontWeight: 500
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.15)'
        }
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(0, 206, 209, 0.02)', 'rgba(0, 206, 209, 0.05)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.2)'
        }
      }
    },
    series: [
      {
        type: 'radar',
        emphasis: {
          lineStyle: {
            width: 3
          }
        },
        data: seriesData
      }
    ]
  } as ECOption
})

const hourlyCompareOption = computed<ECOption>(() => {
  const data = multiDimData.value
  if (data.length === 0) return {} as ECOption

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

  const series = data.slice(0, 6).map((d, i) => {
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length]
    return {
      name: dayjs(d.date).format('MM-DD'),
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: d.hourlyData.map(h => h.count),
      lineStyle: {
        width: 2,
        color
      },
      itemStyle: { color },
      emphasis: {
        lineStyle: { width: 3 }
      }
    } as LineSeriesOption
  })

  return {
    backgroundColor: 'transparent',
    animation: true,
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
        type: 'cross',
        lineStyle: { color: 'rgba(0, 206, 209, 0.5)' }
      }
    },
    legend: {
      data: data.slice(0, 6).map((d, i) => ({
        name: dayjs(d.date).format('MM-DD'),
        itemStyle: { color: COLOR_PALETTE[i % COLOR_PALETTE.length] }
      })),
      top: 0,
      right: 0,
      textStyle: {
        color: '#a0aec0',
        fontSize: 12
      },
      itemWidth: 16,
      itemHeight: 8,
      type: 'scroll'
    },
    xAxis: {
      type: 'category',
      data: hours,
      boundaryGap: false,
      axisLine: {
        lineStyle: { color: 'rgba(0, 206, 209, 0.25)' }
      },
      axisLabel: {
        color: '#718096',
        fontSize: 10,
        interval: 2
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#718096',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 206, 209, 0.08)',
          type: 'dashed'
        }
      }
    },
    series
  } as ECOption
})

const analysisConclusions = computed<string[]>(() => {
  const conclusions: string[] = []
  const data = multiDimData.value
  if (data.length < 1) return conclusions

  if (data.length === 1) {
    const d = data[0]
    conclusions.push(`${formatDate(d.date)}共输入 <strong style="color:#00CED1">${d.totalCount.toLocaleString('zh-CN')}</strong> 次按键，` +
      `高峰出现在 <strong>${d.peakHour.toString().padStart(2, '0')}:00</strong> 时段。`)
    conclusions.push(`字母占比 <strong>${d.letterRatio}%</strong>，修饰键占比 <strong>${d.modifierRatio}%</strong>，` +
      `修改率（Backspace）为 <strong>${d.backspaceRatio}%</strong>。`)
    return conclusions
  }

  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const weekdayData = sortedData.filter(d => {
    const w = dayjs(d.date).day()
    return w >= 1 && w <= 5
  })
  const weekendData = sortedData.filter(d => {
    const w = dayjs(d.date).day()
    return w === 0 || w === 6
  })

  const avgWeekday = weekdayData.length > 0
    ? weekdayData.reduce((s, d) => s + d.totalCount, 0) / weekdayData.length
    : 0
  const avgWeekend = weekendData.length > 0
    ? weekendData.reduce((s, d) => s + d.totalCount, 0) / weekendData.length
    : 0

  if (avgWeekday > 0 && avgWeekend > 0) {
    const diffPct = Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100)
    const weekdayBs = weekdayData.reduce((s, d) => s + d.backspaceRatio, 0) / weekdayData.length
    const weekendBs = weekendData.reduce((s, d) => s + d.backspaceRatio, 0) / weekendData.length
    const bsDiff = Math.round(weekendBs - weekdayBs)

    if (Math.abs(diffPct) >= 10) {
      let msg = `周末输入量${diffPct >= 0 ? '比工作日高' : '比工作日平均低'} <strong style="color:#00CED1">${Math.abs(diffPct)}%</strong>`
      if (bsDiff >= 2) {
        msg += `，但 Backspace 率高 <strong style="color:#FF6B6B">${bsDiff}%</strong>，可能打字更随意`
      } else if (bsDiff <= -2) {
        msg += `，且 Backspace 率低 <strong style="color:#10b981">${Math.abs(bsDiff)}%</strong>，周末输入更精准`
      }
      conclusions.push(msg + '。')
    }
  }

  for (let i = 1; i < sortedData.length; i++) {
    const prev = sortedData[i - 1]
    const curr = sortedData[i]

    if (prev.totalCount === 0) continue
    const diffPct = Math.round(((curr.totalCount - prev.totalCount) / prev.totalCount) * 100)

    if (Math.abs(diffPct) >= 15) {
      const prevHourly = prev.hourlyData
      const currHourly = curr.hourlyData
      const increases: Array<{ range: string; diff: number }> = []

      for (let h = 0; h < 24; h += 2) {
        const pSum = prevHourly.slice(h, h + 2).reduce((s, x) => s + x.count, 0)
        const cSum = currHourly.slice(h, h + 2).reduce((s, x) => s + x.count, 0)
        const diff = cSum - pSum
        if (diff > 0) {
          increases.push({
            range: `${h.toString().padStart(2, '0')}-${(h + 2).toString().padStart(2, '0')}`,
            diff
          })
        }
      }

      increases.sort((a, b) => b.diff - a.diff)
      const mainRange = increases.length > 0 ? increases[0].range : null

      let msg = `${formatDate(curr.date)}${diffPct > 0 ? '比' : '比'}${formatDate(prev.date)}` +
        `${diffPct > 0 ? '多输入' : '少输入'} <strong style="color:${diffPct > 0 ? '#00CED1' : '#FF6B6B'}">${Math.abs(diffPct)}%</strong>`

      if (mainRange && diffPct > 0) {
        msg += `，主要${diffPct > 0 ? '增加' : '减少'}在 <strong>${mainRange}</strong> 时段`
      }
      conclusions.push(msg + '。')
    }
  }

  const maxData = sortedData.reduce((max, d) => d.totalCount > max.totalCount ? d : max, sortedData[0])
  const minData = sortedData.reduce((min, d) => d.totalCount < min.totalCount ? d : min, sortedData[0])

  if (maxData.date !== minData.date && minData.totalCount > 0) {
    const pct = Math.round(((maxData.totalCount - minData.totalCount) / minData.totalCount) * 100)
    if (pct >= 50) {
      conclusions.push(`按键量波动较大：<strong>${formatDate(maxData.date)}</strong>（${maxData.totalCount.toLocaleString('zh-CN')}次）` +
        `比 <strong>${formatDate(minData.date)}</strong>（${minData.totalCount.toLocaleString('zh-CN')}次）` +
        `高出 <strong style="color:#00CED1">${pct}%</strong>。`)
    }
  }

  const bsSorted = [...sortedData].sort((a, b) => b.backspaceRatio - a.backspaceRatio)
  const highestBs = bsSorted[0]
  const avgBs = sortedData.reduce((s, d) => s + d.backspaceRatio, 0) / sortedData.length
  if (highestBs.backspaceRatio > avgBs * 1.3 && avgBs > 0) {
    conclusions.push(`<strong>${formatDate(highestBs.date)}</strong> 的修改率最高（<strong style="color:#FF6B6B">${highestBs.backspaceRatio}%</strong>），` +
      `较平均值高出 ${Math.round((highestBs.backspaceRatio / avgBs - 1) * 100)}%，` +
      `当天可能在反复修改内容或输入准确性较低。`)
  }

  if (conclusions.length === 0) {
    conclusions.push(`选择的 ${sortedData.length} 天数据表现较为接近，日均按键量 ` +
      `<strong>${Math.round(sortedData.reduce((s, d) => s + d.totalCount, 0) / sortedData.length).toLocaleString('zh-CN')}</strong> 次。`)
  }

  return conclusions
})

const dateStats = computed(() => {
  const data = multiDimData.value
  if (data.length === 0) {
    return { total: 0, avg: 0, max: 0, min: 0, bsAvg: 0 }
  }
  const total = data.reduce((s, d) => s + d.totalCount, 0)
  const counts = data.map(d => d.totalCount)
  return {
    total,
    avg: Math.round(total / data.length),
    max: Math.max(...counts),
    min: Math.min(...counts),
    bsAvg: Math.round(data.reduce((s, d) => s + d.backspaceRatio, 0) / data.length * 100) / 100
  }
})

function formatDate(dateStr: string): string {
  const d = dayjs(dateStr)
  return `${d.month() + 1}月${d.date()}日`
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

async function exportReport() {
  if (multiDimData.value.length === 0) {
    Message.warning('请先选择日期并加载数据')
    return
  }

  exporting.value = true
  try {
    await nextTick()

    const radarChart = radarChartRef.value?.getEchartsInstance?.() as echarts.ECharts | undefined
    const hourlyChart = hourlyChartRef.value?.getEchartsInstance?.() as echarts.ECharts | undefined

    if (!radarChart || !hourlyChart) {
      Message.error('图表尚未就绪，请稍后重试')
      return
    }

    const radarDataUrl = radarChart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#0a0e17'
    })
    const hourlyDataUrl = hourlyChart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#0a0e17'
    })

    const reportCanvas = await generateReportImage(
      radarDataUrl,
      hourlyDataUrl,
      multiDimData.value,
      analysisConclusions.value
    )

    const dataUrl = reportCanvas.toDataURL('image/png')
    const dateRange = multiDimData.value.length > 0
      ? `${multiDimData.value[0].date}_${multiDimData.value[multiDimData.value.length - 1].date}`
      : dayjs().format('YYYY-MM-DD')

    if (window.electronAPI && (window.electronAPI as any).saveReportImage) {
      const result = await window.electronAPI.saveReportImage(dataUrl, `键盘对比报告_${dateRange}.png`)
      if (result.success) {
        Message.success('报告已保存至：' + result.path)
      } else {
        Message.error(result.error || '保存失败')
      }
    } else {
      const link = document.createElement('a')
      link.download = `键盘对比报告_${dateRange}.png`
      link.href = dataUrl
      link.click()
      Message.success('报告下载已开始')
    }
  } catch (error) {
    console.error('导出报告失败:', error)
    Message.error('导出报告失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    exporting.value = false
  }
}

async function generateReportImage(
  radarDataUrl: string,
  hourlyDataUrl: string,
  data: DayMultiDimData[],
  conclusions: string[]
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  const width = 1200
  const height = 1600
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#0d1525')
  gradient.addColorStop(0.5, '#0a0e17')
  gradient.addColorStop(1, '#0d1525')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(0, 206, 209, 0.05)'
  ctx.lineWidth = 1
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.fillStyle = '#00CED1'
  ctx.font = 'bold 36px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('键盘使用多维对比分析报告', width / 2, 70)

  ctx.fillStyle = '#718096'
  ctx.font = '16px "Microsoft YaHei", sans-serif'
  const dateRangeText = data.length > 0
    ? `报告周期：${data[0].date} ~ ${data[data.length - 1].date}  共 ${data.length} 天`
    : ''
  ctx.fillText(dateRangeText, width / 2, 105)
  ctx.fillText(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, width / 2, 130)

  ctx.strokeStyle = 'rgba(0, 206, 209, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, 160)
  ctx.lineTo(width - 80, 160)
  ctx.stroke()

  const totalCount = data.reduce((s, d) => s + d.totalCount, 0)
  const avgCount = data.length > 0 ? Math.round(totalCount / data.length) : 0
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.totalCount)) : 0
  const avgBs = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.backspaceRatio, 0) / data.length * 100) / 100
    : 0

  drawStatCard(ctx, 80, 200, 240, 120, '周期总计', formatNumber(totalCount), '#00CED1')
  drawStatCard(ctx, 340, 200, 240, 120, '日均按键', formatNumber(avgCount), '#4ECDC4')
  drawStatCard(ctx, 600, 200, 240, 120, '峰值记录', formatNumber(maxCount), '#FFD93D')
  drawStatCard(ctx, 860, 200, 240, 120, '平均修改率', avgBs + '%', '#FF6B6B')

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('多维雷达对比', 80, 370)

  const radarImg = await loadImage(radarDataUrl)
  const radarSize = 500
  const radarX = (width - radarSize) / 2
  ctx.drawImage(radarImg, radarX, 390, radarSize, radarSize)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'
  ctx.fillText('24小时分布对比', 80, 930)

  const hourlyImg = await loadImage(hourlyDataUrl)
  const hWidth = width - 160
  const hHeight = 300
  ctx.drawImage(hourlyImg, 80, 950, hWidth, hHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'
  ctx.fillText('差异分析结论', 80, 1290)

  ctx.fillStyle = 'rgba(0, 206, 209, 0.08)'
  ctx.strokeStyle = 'rgba(0, 206, 209, 0.2)'
  ctx.lineWidth = 1
  roundRect(ctx, 80, 1310, width - 160, 220, 12)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.font = '17px "Microsoft YaHei", sans-serif'
  let y = 1350
  const plainConclusions = conclusions.map(c => c.replace(/<[^>]+>/g, ''))

  for (let i = 0; i < Math.min(plainConclusions.length, 5); i++) {
    ctx.fillStyle = i === 0 ? '#00CED1' : '#FFD93D'
    ctx.beginPath()
    ctx.arc(108, y - 5, 5, 0, Math.PI * 2)
    ctx.fill()

    wrapText(ctx, plainConclusions[i], 130, y, width - 210, 28)
    y += 38
    const lines = Math.ceil(ctx.measureText(plainConclusions[i]).width / (width - 210))
    if (lines > 1) y += (lines - 1) * 28
  }

  ctx.fillStyle = 'rgba(0, 206, 209, 0.5)'
  ctx.font = '14px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('— 由 KeyboardStats 智能生成 —', width / 2, height - 30)

  return canvas
}

function drawStatCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string, value: string, color: string
) {
  ctx.fillStyle = 'rgba(26, 34, 52, 0.8)'
  ctx.strokeStyle = 'rgba(0, 206, 209, 0.2)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#718096'
  ctx.font = '15px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, x + w / 2, y + 40)

  ctx.fillStyle = color
  ctx.font = 'bold 28px Consolas, Monaco, monospace'
  ctx.fillText(value, x + w / 2, y + 82)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxWidth: number, lineHeight: number
) {
  const chars = text.split('')
  let line = ''
  let cy = y
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(line, x, cy)
      line = chars[i]
      cy += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(line, x, cy)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
</script>

<template>
  <div class="daily-compare" ref="reportRef">
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-label">周期总计</div>
        <div class="stat-value">{{ formatNumber(dateStats.total) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">日均按键</div>
        <div class="stat-value">{{ formatNumber(dateStats.avg) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">峰值/最低</div>
        <div class="stat-value accent">
          <span>{{ formatNumber(dateStats.max) }}</span>
          <span class="divider">/</span>
          <span class="mini">{{ formatNumber(dateStats.min) }}</span>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">平均修改率</div>
        <div class="stat-value warning">{{ dateStats.bsAvg }}%</div>
      </div>
    </div>

    <div class="controls-card">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">📅</span>
          日期选择
        </h3>
        <div class="header-controls">
          <a-radio-group v-model="viewMode" type="button" size="small">
            <a-radio value="quick">快捷范围</a-radio>
            <a-radio value="custom">自定义多选</a-radio>
          </a-radio-group>
          <a-button
            v-if="multiDimData.length > 0"
            type="primary"
            :loading="exporting"
            @click="exportReport"
          >
            <template #icon>📥</template>
            {{ exporting ? '导出中...' : '导出报告' }}
          </a-button>
        </div>
      </div>

      <div class="controls-body">
        <div v-if="viewMode === 'quick'" class="quick-controls">
          <a-radio-group v-model="dayRange" type="button">
            <a-radio :value="7">近7天</a-radio>
            <a-radio :value="14">近14天</a-radio>
            <a-radio :value="30">近30天</a-radio>
            <a-radio :value="60">近60天</a-radio>
            <a-radio :value="90">近90天</a-radio>
          </a-radio-group>
        </div>

        <div v-else class="custom-controls">
          <div class="calendar-wrap">
            <a-calendar
              :value="calendarValue.length > 0 ? new Date(calendarValue[0]) : new Date()"
              :mode="'month'"
              :selectable="true"
              :range-select="false"
              multiple
              @select="onCalendarSelect"
            />
          </div>
          <div class="selected-dates-panel">
            <div class="panel-header">
              <span class="panel-title">已选日期 ({{ selectedDates.length }})</span>
              <a-button v-if="selectedDates.length > 0" size="mini" status="danger" @click="clearDates">
                清空
              </a-button>
            </div>
            <div class="dates-list" v-if="selectedDates.length > 0">
              <div
                v-for="(date, idx) in selectedDates"
                :key="date"
                class="date-tag"
                :style="{ '--tag-color': COLOR_PALETTE[idx % COLOR_PALETTE.length] }"
              >
                <span class="date-dot"></span>
                <span class="date-text">{{ date }}</span>
                <span class="date-remove" @click="removeDate(date)">×</span>
              </div>
            </div>
            <div v-else class="empty-hint">
              请在左侧日历中点击选择任意日期进行对比
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-row" v-if="!loading && multiDimData.length > 0">
      <div class="chart-card radar-card">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">🎯</span>
            多维雷达对比
          </h3>
        </div>
        <div class="chart-container">
          <v-chart ref="radarChartRef" :option="radarOption" autoresize />
        </div>
      </div>
    </div>

    <div class="chart-card" v-if="!loading && multiDimData.length > 0">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">⏰</span>
          24小时分布对比
        </h3>
      </div>
      <div class="chart-container hourly-container">
        <v-chart ref="hourlyChartRef" :option="hourlyCompareOption" autoresize />
      </div>
    </div>

    <div class="chart-card conclusions-card" v-if="!loading && analysisConclusions.length > 0">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">💡</span>
          差异分析结论
        </h3>
      </div>
      <div class="conclusions-body">
        <div
          v-for="(conclusion, idx) in analysisConclusions"
          :key="idx"
          class="conclusion-item"
          :class="{ highlight: idx === 0 }"
        >
          <span class="conclusion-bullet">{{ idx + 1 }}</span>
          <span class="conclusion-text" v-html="conclusion"></span>
        </div>
      </div>
    </div>

    <div class="chart-card details-card" v-if="!loading && multiDimData.length > 0">
      <div class="card-header">
        <h3 class="card-title">
          <span class="title-icon">📋</span>
          每日详情
        </h3>
      </div>
      <div class="details-table-wrap">
        <table class="details-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>总按键</th>
              <th>峰值时段</th>
              <th>字母占比</th>
              <th>修饰键占比</th>
              <th>Backspace率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in multiDimData" :key="d.date">
              <td>
                <span class="row-dot" :style="{ background: COLOR_PALETTE[idx % COLOR_PALETTE.length] }"></span>
                {{ d.date }}
              </td>
              <td class="num">{{ formatNumber(d.totalCount) }}</td>
              <td class="num">{{ d.peakHour.toString().padStart(2, '0') }}:00</td>
              <td class="num">{{ d.letterRatio }}%</td>
              <td class="num">{{ d.modifierRatio }}%</td>
              <td class="num highlight-bs">{{ d.backspaceRatio }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="empty-state" v-if="!loading && multiDimData.length === 0">
      <div class="empty-icon">📊</div>
      <div class="empty-text">请选择日期进行多维对比分析</div>
      <div class="empty-hint">支持快捷范围选择或任意日期多选</div>
    </div>

    <div class="empty-state" v-else-if="loading">
      <div class="empty-icon">⏳</div>
      <div class="empty-text">数据加载中...</div>
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.stat-value .divider {
  font-size: 18px;
  color: var(--text-tertiary);
  -webkit-text-fill-color: var(--text-tertiary);
  opacity: 0.5;
}

.stat-value .mini {
  font-size: 18px;
  opacity: 0.7;
}

.stat-value.accent {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.warning {
  background: linear-gradient(135deg, var(--warning), #ff9f43);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.controls-card,
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.controls-card:hover,
.chart-card:hover {
  border-color: var(--border-hover);
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

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.controls-body {
  margin-top: 8px;
}

.quick-controls {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.custom-controls {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.calendar-wrap {
  background: rgba(17, 24, 39, 0.5);
  border-radius: 10px;
  padding: 12px;
}

.calendar-wrap :deep(.arco-picker) {
  background: transparent !important;
  border: none !important;
}

.calendar-wrap :deep(.arco-calendar) {
  background: transparent;
  --color-bg-2: transparent;
  --color-bg-3: rgba(0, 206, 209, 0.1);
  --color-border-2: rgba(0, 206, 209, 0.15);
  --color-text-1: #fff;
  --color-text-2: #a0aec0;
  --color-text-3: #718096;
  --color-primary-light-1: rgba(0, 206, 209, 0.2);
  --color-primary-light-2: rgba(0, 206, 209, 0.15);
}

.selected-dates-panel {
  background: rgba(17, 24, 39, 0.5);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.dates-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.date-tag {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 206, 209, 0.06);
  border: 1px solid rgba(0, 206, 209, 0.2);
  border-left: 3px solid var(--tag-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.date-tag:hover {
  background: rgba(0, 206, 209, 0.1);
  border-color: rgba(0, 206, 209, 0.4);
}

.date-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tag-color);
  flex-shrink: 0;
}

.date-text {
  flex: 1;
  font-size: 13px;
  font-family: 'Consolas', monospace;
  color: var(--text-primary);
}

.date-remove {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  line-height: 1;
}

.date-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
  padding: 20px;
  line-height: 1.6;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.chart-container {
  height: 420px;
  min-height: 0;
}

.hourly-container {
  height: 320px;
}

.chart-container :deep(.echarts) {
  width: 100%;
  height: 100%;
}

.conclusions-card .conclusions-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.conclusion-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(0, 206, 209, 0.04);
  border: 1px solid rgba(0, 206, 209, 0.1);
  border-radius: 10px;
  transition: all 0.2s;
}

.conclusion-item:hover {
  background: rgba(0, 206, 209, 0.08);
  border-color: rgba(0, 206, 209, 0.25);
}

.conclusion-item.highlight {
  background: rgba(0, 206, 209, 0.1);
  border-color: rgba(0, 206, 209, 0.35);
}

.conclusion-bullet {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: #0a0e17;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.conclusion-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.details-card .details-table-wrap {
  overflow-x: auto;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.details-table th {
  padding: 12px 16px;
  text-align: left;
  background: rgba(0, 206, 209, 0.08);
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 2px solid rgba(0, 206, 209, 0.2);
}

.details-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.08);
  color: var(--text-primary);
}

.details-table tbody tr:hover {
  background: rgba(0, 206, 209, 0.04);
}

.details-table td.num {
  font-family: 'Consolas', monospace;
}

.details-table td.highlight-bs {
  color: var(--warning);
  font-weight: 600;
}

.row-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-tertiary);
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

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  .custom-controls {
    grid-template-columns: 1fr;
  }
  .header-controls {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
