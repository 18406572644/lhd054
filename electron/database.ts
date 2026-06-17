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
