import { describe, expect, it } from 'vitest'
import {
  HISTORY_KEY,
  completeGame,
  ensureGameStarted,
  readHistory,
  summarizeHistory,
  writeHistory,
  type GameRecord,
} from './history'
import type { StorageLike } from './persistence'

const memoryStorage = (): StorageLike => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

const record: GameRecord = {
  id: '11:42:1000',
  seed: 42,
  size: 11,
  startedAt: 1_000,
  completedAt: null,
  assisted: false,
}

describe('histórico', () => {
  it('grava e recupera partidas sem duplicar início', () => {
    const storage = memoryStorage()
    const first = ensureGameStarted([], record)
    const duplicate = ensureGameStarted(first, record)

    expect(duplicate).toBe(first)
    expect(writeHistory(storage, duplicate)).toBe(true)
    expect(readHistory(storage)).toEqual([record])
  })

  it('registra conclusão e calcula estatísticas', () => {
    const finished = completeGame([record], record.id, 6_000, true)

    expect(completeGame(finished, record.id, 7_000, false)).toEqual(finished)
    expect(summarizeHistory(finished)).toEqual({
      started: 1,
      completed: 1,
      assisted: 1,
      fastestMs: 5_000,
    })
  })

  it('ignora histórico corrompido', () => {
    const storage = memoryStorage()
    storage.setItem(HISTORY_KEY, '{"invalid":true}')

    expect(readHistory(storage)).toEqual([])
  })
})
