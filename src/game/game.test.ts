import { beforeAll, describe, expect, it } from 'vitest'
import { CORPUS, CORPUS_VERSION } from '../data/corpus'
import { generatePuzzle } from '../engine/generator'
import type { Puzzle } from '../engine/types'
import {
  entryAt,
  entryCells,
  firstEmptyCell,
  moveSelection,
  nextEntry,
  orderedEntries,
  resolveDirection,
  stepInEntry,
} from './navigation'
import {
  SAVE_KEY,
  clearSave,
  readSave,
  restoreGame,
  saveGame,
  type StorageLike,
} from './persistence'
import {
  checkAll,
  clearCell,
  createGame,
  isComplete,
  progress,
  revealAll,
  revealCell,
  revealEntry,
  setLetter,
  usedHelp,
} from './play'

let puzzle: Puzzle

beforeAll(() => {
  puzzle = generatePuzzle(7, CORPUS)
})

const firstEntry = () => puzzle.entries[0] as Puzzle['entries'][number]

const blackCell = (): [number, number] => {
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (puzzle.solution[r]?.[c] === null) return [r, c]
    }
  }
  throw new Error('sem célula preta')
}

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('jogo', () => {
  it('define e limpa letras sem mutar', () => {
    const game = createGame(puzzle)
    const entry = firstEntry()
    const next = setLetter(game, puzzle, entry.row, entry.col, 'Q')
    expect(game.input[entry.row]?.[entry.col]).toBe('')
    expect(next.input[entry.row]?.[entry.col]).toBe('Q')
    expect(clearCell(next, puzzle, entry.row, entry.col).input[entry.row]?.[entry.col]).toBe('')
  })

  it('ignora células pretas, letras inválidas e reveladas', () => {
    const game = createGame(puzzle)
    const [br, bc] = blackCell()
    expect(setLetter(game, puzzle, br, bc, 'A')).toBe(game)
    const entry = firstEntry()
    expect(setLetter(game, puzzle, entry.row, entry.col, '1')).toBe(game)
    const revealed = revealCell(game, puzzle, entry.row, entry.col)
    expect(setLetter(revealed, puzzle, entry.row, entry.col, 'Q')).toBe(revealed)
    expect(clearCell(revealed, puzzle, entry.row, entry.col)).toBe(revealed)
  })

  it('verifica células erradas e limpa marca ao editar', () => {
    const entry = firstEntry()
    const wrong = entry.answer[0] === 'Q' ? 'W' : 'Q'
    let game = setLetter(createGame(puzzle), puzzle, entry.row, entry.col, wrong)
    game = checkAll(game, puzzle)
    expect(game.flagged[entry.row]?.[entry.col]).toBe(true)
    game = setLetter(game, puzzle, entry.row, entry.col, entry.answer[0] as string)
    expect(game.flagged[entry.row]?.[entry.col]).toBe(false)
  })

  it('revela palavra, tudo e completa', () => {
    const entry = firstEntry()
    const game = revealEntry(createGame(puzzle), puzzle, entry)
    expect(usedHelp(game)).toBe(true)
    expect(usedHelp(createGame(puzzle))).toBe(false)
    expect(isComplete(game, puzzle)).toBe(false)
    const all = revealAll(game, puzzle)
    expect(isComplete(all, puzzle)).toBe(true)
    const p = progress(all, puzzle)
    expect(p.filled).toBe(p.total)
    expect(p.correct).toBe(p.total)
  })

  it('completa digitando manualmente sem ajuda', () => {
    let game = createGame(puzzle)
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const letter = puzzle.solution[r]?.[c]
        if (letter) game = setLetter(game, puzzle, r, c, letter)
      }
    }
    expect(isComplete(game, puzzle)).toBe(true)
    expect(usedHelp(game)).toBe(false)
  })
})

describe('navegação', () => {
  it('encontra entrada e células', () => {
    const entry = firstEntry()
    expect(entryAt(puzzle, entry.row, entry.col, entry.direction)?.id).toBe(entry.id)
    expect(entryCells(entry)).toHaveLength(entry.length)
    expect(resolveDirection(puzzle, entry.row, entry.col, entry.direction)).toBe(entry.direction)
  })

  it('avança dentro da entrada', () => {
    const entry = firstEntry()
    const second = stepInEntry(entry, entry.row, entry.col, 1)
    expect(second).not.toBeNull()
    expect(stepInEntry(entry, entry.row, entry.col, -1)).toBeNull()
  })

  it('cicla entre entradas', () => {
    const list = orderedEntries(puzzle)
    const first = list[0] as Puzzle['entries'][number]
    const last = list[list.length - 1] as Puzzle['entries'][number]
    expect(nextEntry(puzzle, first, -1)?.id).toBe(last.id)
    expect(nextEntry(puzzle, last, 1)?.id).toBe(first.id)
    expect(nextEntry(puzzle, first, 1)?.id).toBe(list[1]?.id)
  })

  it('acha primeira célula vazia', () => {
    const entry = firstEntry()
    const cells = entryCells(entry)
    const first = cells[0] as { row: number; col: number }
    let game = setLetter(createGame(puzzle), puzzle, first.row, first.col, 'A')
    const second = cells[1] as { row: number; col: number }
    expect(firstEmptyCell(entry, game)).toEqual(second)
    game = revealEntry(game, puzzle, entry)
    expect(firstEmptyCell(entry, game)).toEqual(first)
  })

  it('move seleção pulando células pretas e respeitando bordas', () => {
    const entry = firstEntry()
    const selection = { row: entry.row, col: entry.col, direction: entry.direction }
    const moved = moveSelection(puzzle, selection, 'ArrowRight')
    expect(puzzle.solution[moved.row]?.[moved.col]).not.toBeNull()
    expect(moveSelection(puzzle, { row: 0, col: 0, direction: 'across' }, 'ArrowUp').row).toBe(0)
  })
})

describe('persistência', () => {
  it('faz roundtrip', () => {
    const storage = memoryStorage()
    const savePuzzle = generatePuzzle(7, CORPUS, { size: 11 })
    const entry = savePuzzle.entries[0] as Puzzle['entries'][number]
    const game = revealEntry(
      setLetter(createGame(savePuzzle), savePuzzle, 0, 0, 'A'),
      savePuzzle,
      entry,
    )
    expect(saveGame(storage, savePuzzle, game, CORPUS_VERSION, 10, 11)).toBe(true)
    const save = readSave(storage)
    expect(save?.seed).toBe(puzzle.seed)
    expect(save?.size).toBe(11)
    expect(save?.savedAt).toBe(10)
    const savedPuzzle = save ? generatePuzzle(save.seed, CORPUS, { size: save.size }) : null
    const restored = save && savedPuzzle ? restoreGame(savedPuzzle, save) : null
    expect(restored?.input).toEqual(game.input)
    expect(restored?.revealed).toEqual(game.revealed)
    clearSave(storage)
    expect(readSave(storage)).toBeNull()
  })

  it('retorna nulo para JSON corrompido', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, '{nao-e-json')
    expect(readSave(storage)).toBeNull()
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1 }))
    expect(readSave(storage)).toBeNull()
  })

  it('retorna nulo para versão incorreta', () => {
    const storage = memoryStorage()
    saveGame(storage, puzzle, createGame(puzzle), CORPUS_VERSION)
    const raw = JSON.parse(storage.getItem(SAVE_KEY) as string) as Record<string, unknown>
    storage.setItem(SAVE_KEY, JSON.stringify({ ...raw, version: 2 }))
    expect(readSave(storage)).toBeNull()
  })

  it('rejeita dificuldade desconhecida', () => {
    const storage = memoryStorage()
    saveGame(storage, puzzle, createGame(puzzle), CORPUS_VERSION)
    const raw = JSON.parse(storage.getItem(SAVE_KEY) as string) as Record<string, unknown>
    storage.setItem(SAVE_KEY, JSON.stringify({ ...raw, size: 10 }))
    expect(readSave(storage)).toBeNull()
  })

  it('rejeita dimensões erradas e letras inválidas', () => {
    const storage = memoryStorage()
    const game = createGame(puzzle)
    saveGame(storage, puzzle, game, CORPUS_VERSION)
    const save = readSave(storage)
    expect(save).not.toBeNull()
    if (!save) return
    expect(restoreGame(puzzle, { ...save, input: save.input.slice(1) })).toBeNull()
    expect(
      restoreGame(puzzle, { ...save, input: save.input.map((row) => row.slice(1)) }),
    ).toBeNull()
    const entry = firstEntry()
    const badLetter = save.input.map((row) => [...row])
    ;(badLetter[entry.row] as string[])[entry.col] = 'a'
    expect(restoreGame(puzzle, { ...save, input: badLetter })).toBeNull()
    const [br, bc] = blackCell()
    const onBlack = save.input.map((row) => [...row])
    ;(onBlack[br] as string[])[bc] = 'A'
    expect(restoreGame(puzzle, { ...save, input: onBlack })).toBeNull()
  })

  it('tolera armazenamento que lança erro', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('negado')
      },
      setItem: () => {
        throw new Error('cheio')
      },
      removeItem: () => {
        throw new Error('negado')
      },
    }
    expect(saveGame(broken, puzzle, createGame(puzzle), CORPUS_VERSION)).toBe(false)
    expect(readSave(broken)).toBeNull()
    expect(() => clearSave(broken)).not.toThrow()
  })
})