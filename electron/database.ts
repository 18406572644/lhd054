import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import dayjs from 'dayjs'

let db: Database.Database | null = null

export function initDatabase() {
  const dbPath = join(app.getPath('userData'), 'keyboard-stats.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS key_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      key_code INTEGER NOT NULL,
      key_name TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, hour, key_code)
    );
    
    CREATE TABLE IF NOT EXISTS daily_totals (
      date TEXT PRIMARY KEY,
      total_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_key_stats_date ON key_stats(date);
    CREATE INDEX IF NOT EXISTS idx_key_stats_key ON key_stats(key_code);
  `)
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function recordKeyPress(keyCode: number, keyName: string) {
  const now = dayjs()
  const date = now.format('YYYY-MM-DD')
  const hour = now.hour()

  const db = getDb()
  
  const stmt = db.prepare(`
    INSERT INTO key_stats (date, hour, key_code, key_name, count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(date, hour, key_code) 
    DO UPDATE SET count = count + 1
  `)
  stmt.run(date, hour, keyCode, keyName)
  
  const dailyStmt = db.prepare(`
    INSERT INTO daily_totals (date, total_count)
    VALUES (?, 1)
    ON CONFLICT(date) 
    DO UPDATE SET total_count = total_count + 1
  `)
  dailyStmt.run(date)
}

export function getTodayStats(): { total: number; date: string } {
  const date = dayjs().format('YYYY-MM-DD')
  const db = getDb()
  
  const result = db.prepare(`
    SELECT total_count FROM daily_totals WHERE date = ?
  `).get(date) as { total_count: number } | undefined
  
  return {
    total: result?.total_count || 0,
    date
  }
}

export function getKeyFrequency(limit: number = 20): Array<{ key: string; count: number; percentage: number }> {
  const db = getDb()
  
  const totalResult = db.prepare(`
    SELECT SUM(count) as total FROM key_stats
  `).get() as { total: number } | undefined
  
  const total = totalResult?.total || 1
  
  const results = db.prepare(`
    SELECT 
      MAX(key_name) as key, 
      SUM(count) as count
    FROM key_stats
    GROUP BY key_code
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as Array<{ key: string; count: number }>
  
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0
  }))
}

export function getDailyStats(days: number = 7): Array<{ date: string; count: number }> {
  const db = getDb()
  const endDate = dayjs()
  const startDate = endDate.subtract(days - 1, 'day')
  
  const results = db.prepare(`
    SELECT date, total_count as count
    FROM daily_totals
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')) as Array<{ date: string; count: number }>
  
  const resultMap = new Map(results.map(r => [r.date, r.count]))
  const fullResults = []
  
  for (let i = 0; i < days; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD')
    fullResults.push({
      date,
      count: resultMap.get(date) || 0
    })
  }
  
  return fullResults
}

export function getHourlyStats(date: string): Array<{ hour: number; count: number }> {
  const db = getDb()
  
  const results = db.prepare(`
    SELECT hour, SUM(count) as count
    FROM key_stats
    WHERE date = ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(date) as Array<{ hour: number; count: number }>
  
  const resultMap = new Map(results.map(r => [r.hour, r.count]))
  const fullResults = []
  
  for (let i = 0; i < 24; i++) {
    fullResults.push({
      hour: i,
      count: resultMap.get(i) || 0
    })
  }
  
  return fullResults
}

export interface DayMultiDimData {
  date: string
  totalCount: number
  hourlyData: Array<{ hour: number; count: number }>
  peakHour: number
  letterCount: number
  letterRatio: number
  modifierCount: number
  modifierRatio: number
  backspaceCount: number
  backspaceRatio: number
}

const LETTER_KEY_CODES = Array.from({ length: 26 }, (_, i) => 65 + i)
const MODIFIER_KEY_CODES = [16, 17, 18, 91, 92]
const BACKSPACE_KEY_CODE = 8

export function getMultiDimDailyStats(dates: string[]): DayMultiDimData[] {
  const db = getDb()
  
  return dates.map(date => {
    const hourlyResults = db.prepare(`
      SELECT hour, SUM(count) as count
      FROM key_stats
      WHERE date = ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(date) as Array<{ hour: number; count: number }>
    
    const hourlyMap = new Map(hourlyResults.map(r => [r.hour, r.count]))
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyMap.get(i) || 0
    }))
    
    const totalCount = hourlyData.reduce((sum, h) => sum + h.count, 0)
    
    let peakHour = 0
    let maxHourCount = 0
    hourlyData.forEach(h => {
      if (h.count > maxHourCount) {
        maxHourCount = h.count
        peakHour = h.hour
      }
    })
    
    const categoryResults = db.prepare(`
      SELECT key_code, SUM(count) as count
      FROM key_stats
      WHERE date = ?
      GROUP BY key_code
    `).all(date) as Array<{ key_code: number; count: number }>
    
    let letterCount = 0
    let modifierCount = 0
    let backspaceCount = 0
    
    categoryResults.forEach(r => {
      if (LETTER_KEY_CODES.includes(r.key_code)) {
        letterCount += r.count
      }
      if (MODIFIER_KEY_CODES.includes(r.key_code)) {
        modifierCount += r.count
      }
      if (r.key_code === BACKSPACE_KEY_CODE) {
        backspaceCount += r.count
      }
    })
    
    const safeTotal = totalCount || 1
    
    return {
      date,
      totalCount,
      hourlyData,
      peakHour,
      letterCount,
      letterRatio: Math.round((letterCount / safeTotal) * 10000) / 100,
      modifierCount,
      modifierRatio: Math.round((modifierCount / safeTotal) * 10000) / 100,
      backspaceCount,
      backspaceRatio: Math.round((backspaceCount / safeTotal) * 10000) / 100
    }
  })
}

export function getAvailableDates(): string[] {
  const db = getDb()
  const results = db.prepare(`
    SELECT DISTINCT date FROM daily_totals ORDER BY date DESC
  `).all() as Array<{ date: string }>
  return results.map(r => r.date)
}

export function clearData(): boolean {
  const db = getDb()
  const transaction = db.transaction(() => {
    db.exec('DELETE FROM key_stats')
    db.exec('DELETE FROM daily_totals')
  })
  try {
    transaction()
    return true
  } catch {
    return false
  }
}
