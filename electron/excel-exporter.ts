import ExcelJS from 'exceljs'
import { getDb } from './database'

interface DailyRecord {
  date: string
  total_count: number
}

interface KeyRecord {
  key_name: string
  date: string
  hour: number
  count: number
}

export async function exportToExcel(startDate: string, endDate: string, filePath: string) {
  const db = getDb()
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Keyboard Stats'
  workbook.created = new Date()
  workbook.modified = new Date()

  const summarySheet = workbook.addWorksheet('每日汇总', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  summarySheet.columns = [
    { header: '日期', key: 'date', width: 15 },
    { header: '按键总数', key: 'total_count', width: 15 }
  ]

  const dailyResults = db.prepare(`
    SELECT date, total_count
    FROM daily_totals
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(startDate, endDate) as DailyRecord[]

  dailyResults.forEach(row => {
    summarySheet.addRow({
      date: row.date,
      total_count: row.total_count
    })
  })

  const totalAllTime = dailyResults.reduce((sum, row) => sum + row.total_count, 0)
  const totalRow = summarySheet.addRow({
    date: '合计',
    total_count: totalAllTime
  })
  totalRow.font = { bold: true }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7FF' } }

  const cyanFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00CED1' } }
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } }
  
  summarySheet.getRow(1).eachCell(cell => {
    cell.fill = cyanFill
    cell.font = headerFont
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  const detailSheet = workbook.addWorksheet('按键明细', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  detailSheet.columns = [
    { header: '按键', key: 'key_name', width: 12 },
    { header: '日期', key: 'date', width: 15 },
    { header: '时段', key: 'hour', width: 10 },
    { header: '次数', key: 'count', width: 10 }
  ]

  const keyResults = db.prepare(`
    SELECT key_name, date, hour, count
    FROM key_stats
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC, hour ASC, count DESC
  `).all(startDate, endDate) as KeyRecord[]

  keyResults.forEach(row => {
    detailSheet.addRow({
      key_name: row.key_name,
      date: row.date,
      hour: `${row.hour.toString().padStart(2, '0')}:00`,
      count: row.count
    })
  })

  detailSheet.getRow(1).eachCell(cell => {
    cell.fill = cyanFill
    cell.font = headerFont
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  const frequencySheet = workbook.addWorksheet('按键频率', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  frequencySheet.columns = [
    { header: '排名', key: 'rank', width: 8 },
    { header: '按键', key: 'key_name', width: 12 },
    { header: '次数', key: 'count', width: 15 },
    { header: '占比', key: 'percentage', width: 12 }
  ]

  const freqResults = db.prepare(`
    SELECT key_name, SUM(count) as count
    FROM key_stats
    WHERE date >= ? AND date <= ?
    GROUP BY key_code, key_name
    ORDER BY count DESC
  `).all(startDate, endDate) as Array<{ key_name: string; count: number }>

  const totalFreq = freqResults.reduce((sum, r) => sum + r.count, 0) || 1

  freqResults.forEach((row, index) => {
    const percentage = ((row.count / totalFreq) * 100).toFixed(2) + '%'
    frequencySheet.addRow({
      rank: index + 1,
      key_name: row.key_name,
      count: row.count,
      percentage: percentage
    })
  })

  frequencySheet.getRow(1).eachCell(cell => {
    cell.fill = cyanFill
    cell.font = headerFont
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  summarySheet.eachRow({ includeEmpty: false }, (row) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' }
    row.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    }
  })

  detailSheet.eachRow({ includeEmpty: false }, (row) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' }
    row.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    }
  })

  frequencySheet.eachRow({ includeEmpty: false }, (row) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' }
    row.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    }
  })

  await workbook.xlsx.writeFile(filePath)
}
