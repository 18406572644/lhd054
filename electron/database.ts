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

  const columns = db.prepare("PRAGMA table_info(key_stats)").all() as Array<{ name: string }>
  const hasAppName = columns.some(c => c.name === 'app_name')

  if (!hasAppName) {
    const existingData = db.prepare('SELECT * FROM key_stats').all() as Array<Record<string, any>>
    
    db.exec(`
      DROP TABLE IF EXISTS key_stats_old;
      ALTER TABLE key_stats RENAME TO key_stats_old;
    `)

    db.exec(`
      CREATE TABLE key_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        key_code INTEGER NOT NULL,
        key_name TEXT NOT NULL,
        app_name TEXT NOT NULL DEFAULT '未知应用',
        count INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, hour, key_code, app_name)
      );
      
      CREATE INDEX IF NOT EXISTS idx_key_stats_date ON key_stats(date);
      CREATE INDEX IF NOT EXISTS idx_key_stats_key ON key_stats(key_code);
      CREATE INDEX IF NOT EXISTS idx_key_stats_app ON key_stats(app_name);
    `)

    if (existingData.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO key_stats (date, hour, key_code, key_name, app_name, count, created_at)
        VALUES (?, ?, ?, ?, '未知应用', ?, ?)
      `)
      const transaction = db.transaction(() => {
        for (const row of existingData) {
          insertStmt.run(row.date, row.hour, row.key_code, row.key_name, row.count, row.created_at)
        }
      })
      transaction()
    }

    db.exec('DROP TABLE IF EXISTS key_stats_old')
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS key_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        key_code INTEGER NOT NULL,
        key_name TEXT NOT NULL,
        app_name TEXT NOT NULL DEFAULT '未知应用',
        count INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, hour, key_code, app_name)
      );
    `)
    
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='key_stats'").all() as Array<{ name: string }>
    const hasAppIndex = indexes.some(i => i.name === 'idx_key_stats_app')
    if (!hasAppIndex) {
      db.exec('CREATE INDEX IF NOT EXISTS idx_key_stats_app ON key_stats(app_name);')
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_totals (
      date TEXT PRIMARY KEY,
      total_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_key_stats_date ON key_stats(date);
    CREATE INDEX IF NOT EXISTS idx_key_stats_key ON key_stats(key_code);
    CREATE INDEX IF NOT EXISTS idx_key_stats_app ON key_stats(app_name);
  `)
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function recordKeyPress(keyCode: number, keyName: string, appName: string = '未知应用') {
  const now = dayjs()
  const date = now.format('YYYY-MM-DD')
  const hour = now.hour()

  const db = getDb()
  
  const stmt = db.prepare(`
    INSERT INTO key_stats (date, hour, key_code, key_name, app_name, count)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(date, hour, key_code, app_name) 
    DO UPDATE SET count = count + 1
  `)
  stmt.run(date, hour, keyCode, keyName, appName)
  
  const dailyStmt = db.prepare(`
    INSERT INTO daily_totals (date, total_count)
    VALUES (?, 1)
    ON CONFLICT(date) 
    DO UPDATE SET total_count = total_count + 1
  `)
  dailyStmt.run(date)
}

function buildWhereClause(appName?: string): { clause: string; params: any[] } {
  if (appName && appName !== 'all') {
    return { clause: 'WHERE app_name = ?', params: [appName] }
  }
  return { clause: '', params: [] }
}

export function getTodayStats(appName?: string): { total: number; date: string } {
  const date = dayjs().format('YYYY-MM-DD')
  const db = getDb()
  
  if (appName && appName !== 'all') {
    const result = db.prepare(`
      SELECT SUM(count) as total_count FROM key_stats WHERE date = ? AND app_name = ?
    `).get(date, appName) as { total_count: number } | undefined
    
    return {
      total: result?.total_count || 0,
      date
    }
  }
  
  const result = db.prepare(`
    SELECT total_count FROM daily_totals WHERE date = ?
  `).get(date) as { total_count: number } | undefined
  
  return {
    total: result?.total_count || 0,
    date
  }
}

export function getKeyFrequency(limit: number = 20, appName?: string): Array<{ key: string; count: number; percentage: number }> {
  const db = getDb()
  const where = buildWhereClause(appName)
  
  const totalResult = db.prepare(`
    SELECT SUM(count) as total FROM key_stats ${where.clause}
  `).get(...where.params) as { total: number } | undefined
  
  const total = totalResult?.total || 1
  
  const results = db.prepare(`
    SELECT 
      MAX(key_name) as key, 
      SUM(count) as count
    FROM key_stats
    ${where.clause}
    GROUP BY key_code
    ORDER BY count DESC
    LIMIT ?
  `).all(...where.params, limit) as Array<{ key: string; count: number }>
  
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0
  }))
}

export function getDailyStats(days: number = 7, appName?: string): Array<{ date: string; count: number }> {
  const db = getDb()
  const endDate = dayjs()
  const startDate = endDate.subtract(days - 1, 'day')
  
  if (appName && appName !== 'all') {
    const results = db.prepare(`
      SELECT date, SUM(count) as count
      FROM key_stats
      WHERE date >= ? AND date <= ? AND app_name = ?
      GROUP BY date
      ORDER BY date ASC
    `).all(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), appName) as Array<{ date: string; count: number }>
    
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

export function getHourlyStats(date: string, appName?: string): Array<{ hour: number; count: number }> {
  const db = getDb()
  const where = buildWhereClause(appName)
  const dateClause = where.clause ? `${where.clause} AND date = ?` : 'WHERE date = ?'
  const params = where.clause ? [...where.params, date] : [date]
  
  const results = db.prepare(`
    SELECT hour, SUM(count) as count
    FROM key_stats
    ${dateClause}
    GROUP BY hour
    ORDER BY hour ASC
  `).all(...params) as Array<{ hour: number; count: number }>
  
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

export function getMultiDimDailyStats(dates: string[], appName?: string): DayMultiDimData[] {
  const db = getDb()
  const where = buildWhereClause(appName)
  
  return dates.map(date => {
    const dateClause = where.clause ? `${where.clause} AND date = ?` : 'WHERE date = ?'
    const params = where.clause ? [...where.params, date] : [date]
    
    const hourlyResults = db.prepare(`
      SELECT hour, SUM(count) as count
      FROM key_stats
      ${dateClause}
      GROUP BY hour
      ORDER BY hour ASC
    `).all(...params) as Array<{ hour: number; count: number }>
    
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
      ${dateClause}
      GROUP BY key_code
    `).all(...params) as Array<{ key_code: number; count: number }>
    
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

export function getAvailableApps(): Array<{ app_name: string; total_count: number }> {
  const db = getDb()
  const results = db.prepare(`
    SELECT app_name, SUM(count) as total_count
    FROM key_stats
    GROUP BY app_name
    ORDER BY total_count DESC
  `).all() as Array<{ app_name: string; total_count: number }>
  return results
}

export function getAppStats(limit: number = 20): Array<{ appName: string; count: number; percentage: number }> {
  const db = getDb()
  
  const totalResult = db.prepare(`
    SELECT SUM(count) as total FROM key_stats
  `).get() as { total: number } | undefined
  
  const total = totalResult?.total || 1
  
  const results = db.prepare(`
    SELECT 
      app_name as appName, 
      SUM(count) as count
    FROM key_stats
    GROUP BY app_name
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as Array<{ appName: string; count: number }>
  
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0
  }))
}

export function getAppKeyFrequency(appName: string, limit: number = 20): Array<{ key: string; count: number; percentage: number }> {
  const db = getDb()
  
  const totalResult = db.prepare(`
    SELECT SUM(count) as total FROM key_stats WHERE app_name = ?
  `).get(appName) as { total: number } | undefined
  
  const total = totalResult?.total || 1
  
  const results = db.prepare(`
    SELECT 
      MAX(key_name) as key, 
      SUM(count) as count
    FROM key_stats
    WHERE app_name = ?
    GROUP BY key_code
    ORDER BY count DESC
    LIMIT ?
  `).all(appName, limit) as Array<{ key: string; count: number }>
  
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0
  }))
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
