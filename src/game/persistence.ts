import type { Game } from './play'
import type { Puzzle } from '../engine/types'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const SAVE_KEY = 'crosswordvault:game:v1'

export interface SavedGame {
  version: 1
  corpusVersion: number
  seed: number
  size: 9 | 11 | 13 | 15
  input: string[][]
  revealed: boolean[][]
  savedAt: number
  startedAt?: number
}

const isBoardSize = (value: unknown): value is SavedGame['size'] =>
  value === 9 || value === 11 || value === 13 || value === 15

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMatrix = (value: unknown, guard: (cell: unknown) => boolean): boolean =>
  Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every(guard))

const isSavedGame = (value: unknown): value is SavedGame =>
  isRecord(value) &&
  value.version === 1 &&
  typeof value.corpusVersion === 'number' &&
  typeof value.seed === 'number' &&
  Number.isFinite(value.seed) &&
  isBoardSize(value.size) &&
  typeof value.savedAt === 'number' &&
  (value.startedAt === undefined ||
    (typeof value.startedAt === 'number' && Number.isFinite(value.startedAt))) &&
  isMatrix(value.input, (cell) => typeof cell === 'string') &&
  isMatrix(value.revealed, (cell) => typeof cell === 'boolean')

export function saveGame(
  storage: StorageLike,
  puzzle: Puzzle,
  game: Game,
  corpusVersion: number,
  now: number = Date.now(),
  size: SavedGame['size'] = 15,
  startedAt: number = now,
): boolean {
  const payload: SavedGame = {
    version: 1,
    corpusVersion,
    seed: puzzle.seed,
    size,
    input: game.input,
    revealed: game.revealed,
    savedAt: now,
    startedAt,
  }
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function readSave(storage: StorageLike): SavedGame | null {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSavedGame(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function restoreGame(puzzle: Puzzle, save: SavedGame): Game | null {
  if (save.input.length !== puzzle.rows || save.revealed.length !== puzzle.rows) return null
  for (let r = 0; r < puzzle.rows; r++) {
    const inputRow = save.input[r]
    const revealedRow = save.revealed[r]
    if (!inputRow || !revealedRow) return null
    if (inputRow.length !== puzzle.cols || revealedRow.length !== puzzle.cols) return null
    for (let c = 0; c < puzzle.cols; c++) {
      const value = inputRow[c] ?? ''
      const isLetter = (puzzle.solution[r]?.[c] ?? null) !== null
      if (!isLetter) {
        if (value !== '' || revealedRow[c]) return null
        continue
      }
      if (value !== '' && !/^[A-Z]$/.test(value)) return null
      if (revealedRow[c] && value !== puzzle.solution[r]?.[c]) return null
    }
  }
  return {
    input: save.input.map((row) => [...row]),
    revealed: save.revealed.map((row) => [...row]),
    flagged: save.input.map((row) => row.map(() => false)),
  }
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(SAVE_KEY)
  } catch {
    return
  }
}