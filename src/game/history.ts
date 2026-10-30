import type { StorageLike } from './persistence'

export const HISTORY_KEY = 'crosswordvault:history:v1'
const MAX_HISTORY = 100

export interface GameRecord {
  id: string
  seed: number
  size: 9 | 11 | 13 | 15
  startedAt: number
  completedAt: number | null
  assisted: boolean
}

export interface HistorySummary {
  started: number
  completed: number
  assisted: number
  fastestMs: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Number.isFinite(new Date(value).getTime())

const isGameRecord = (value: unknown): value is GameRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.seed === 'number' &&
  Number.isFinite(value.seed) &&
  (value.size === 9 || value.size === 11 || value.size === 13 || value.size === 15) &&
  isTimestamp(value.startedAt) &&
  (value.completedAt === null ||
    (isTimestamp(value.completedAt) && value.completedAt >= value.startedAt)) &&
  typeof value.assisted === 'boolean'

export function readHistory(storage: StorageLike): GameRecord[] {
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isGameRecord)) return []
    return parsed.slice(-MAX_HISTORY)
  } catch {
    return []
  }
}

export function writeHistory(storage: StorageLike, history: readonly GameRecord[]): boolean {
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)))
    return true
  } catch {
    return false
  }
}

export function ensureGameStarted(history: GameRecord[], game: GameRecord): GameRecord[] {
  if (history.some((record) => record.id === game.id)) return history
  return [...history, { ...game, completedAt: null, assisted: false }].slice(-MAX_HISTORY)
}

export function completeGame(
  history: GameRecord[],
  id: string,
  completedAt: number,
  assisted: boolean,
): GameRecord[] {
  return history.map((record) =>
    record.id === id && record.completedAt === null
      ? { ...record, completedAt, assisted }
      : record,
  )
}

export function summarizeHistory(history: readonly GameRecord[]): HistorySummary {
  const completed = history.filter((record) => record.completedAt !== null)
  const durations = completed.map((record) =>
    Math.max(0, (record.completedAt ?? record.startedAt) - record.startedAt),
  )
  return {
    started: history.length,
    completed: completed.length,
    assisted: completed.filter((record) => record.assisted).length,
    fastestMs: durations.length > 0 ? Math.min(...durations) : null,
  }
}
