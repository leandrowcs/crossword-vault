import { describe, expect, it } from 'vitest'
import { CORPUS } from '../data/corpus'
import { generatePuzzle } from './generator'
import { isValidAnswer, normalizeAnswer } from './normalize'
import { assignNumbers, findRuns } from './numbering'
import { mulberry32, shuffle } from './random'
import type { Entry, Puzzle } from './types'
import { validatePuzzle } from './validate'

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1)

const cellsOf = (entry: Entry): string[] =>
  Array.from({ length: entry.length }, (_, i) =>
    entry.direction === 'across'
      ? `${entry.row}:${entry.col + i}`
      : `${entry.row + i}:${entry.col}`,
  )

const grid = (rows: string[]): (string | null)[][] =>
  rows.map((row) => Array.from(row, (ch) => (ch === '.' ? null : ch)))

function buildPuzzle(rows: string[], words: { answer: string; row: number; col: number; direction: 'across' | 'down' }[]): Puzzle {
  const solution = grid(rows)
  const runs = findRuns(solution)
  const numbers = assignNumbers(runs, solution.length, solution[0]?.length ?? 0)
  const entries: Entry[] = words.map((word) => ({
    id: `${numbers[word.row]?.[word.col]}${word.direction}${word.answer}`,
    number: numbers[word.row]?.[word.col] ?? 0,
    direction: word.direction,
    row: word.row,
    col: word.col,
    length: word.answer.length,
    answer: word.answer,
    display: word.answer,
    clue: 'x',
  }))
  return { seed: 1, rows: solution.length, cols: solution[0]?.length ?? 0, solution, numbers, entries }
}

describe('normalização', () => {
  it('remove acentos e cedilha e coloca em maiúsculas', () => {
    expect(normalizeAnswer('ação')).toBe('ACAO')
    expect(normalizeAnswer('Coração')).toBe('CORACAO')
    expect(normalizeAnswer('árvore')).toBe('ARVORE')
    expect(normalizeAnswer('açúcar')).toBe('ACUCAR')
  })

  it('aceita respostas válidas', () => {
    expect(isValidAnswer('pão')).toBe(true)
    expect(isValidAnswer('relâmpago')).toBe(true)
  })

  it('rejeita dígitos, hífen, espaço e tamanho inválido', () => {
    expect(isValidAnswer('abc1')).toBe(false)
    expect(isValidAnswer('guarda-chuva')).toBe(false)
    expect(isValidAnswer('dois mil')).toBe(false)
    expect(isValidAnswer('a')).toBe(false)
    expect(isValidAnswer('ou')).toBe(true)
    expect(isValidAnswer('abcdefghijklmnop')).toBe(false)
  })
})

describe('aleatoriedade', () => {
  it('mulberry32 é determinístico', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('shuffle preserva elementos e não muta a entrada', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const result = shuffle(input, mulberry32(3))
    expect([...result].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('numeração', () => {
  it('numera grade conhecida', () => {
    const cells = grid(['SOL', 'A.U', 'LAS'])
    const runs = findRuns(cells)
    expect(runs).toEqual([
      { row: 0, col: 0, direction: 'across', length: 3 },
      { row: 0, col: 0, direction: 'down', length: 3 },
      { row: 0, col: 2, direction: 'down', length: 3 },
      { row: 2, col: 0, direction: 'across', length: 3 },
    ])
    expect(assignNumbers(runs, 3, 3)).toEqual([
      [1, null, 2],
      [null, null, null],
      [3, null, null],
    ])
  })

  it('ignora letras isoladas', () => {
    expect(findRuns(grid(['A.B', '...']))).toEqual([])
  })
})

describe('interseções', () => {
  it.each(SEEDS)('seed %i: entradas válidas e cruzadas', (seed) => {
    const puzzle = generatePuzzle(seed, CORPUS)
    for (const entry of puzzle.entries) {
      const cells = cellsOf(entry)
      cells.forEach((key, i) => {
        const [r, c] = key.split(':').map(Number) as [number, number]
        expect(puzzle.solution[r]?.[c]).toBe(entry.answer[i])
      })
      const crossing = puzzle.entries.some(
        (other) =>
          other.direction !== entry.direction &&
          cellsOf(other).some((key) => cells.includes(key)),
      )
      expect(crossing).toBe(true)
    }
  })
})

describe('validade', () => {
  it.each(SEEDS)('seed %i: validatePuzzle sem erros', (seed) => {
    const puzzle = generatePuzzle(seed, CORPUS)
    expect(validatePuzzle(puzzle)).toEqual([])
    expect(puzzle.entries.length).toBeGreaterThanOrEqual(8)
  })

  it('detecta letra errada', () => {
    const puzzle = structuredClone(generatePuzzle(1, CORPUS))
    const entry = puzzle.entries[0] as Entry
    const row = puzzle.solution[entry.row] as (string | null)[]
    row[entry.col] = row[entry.col] === 'Z' ? 'Y' : 'Z'
    expect(validatePuzzle(puzzle).length).toBeGreaterThan(0)
  })

  it('detecta palavras encostadas', () => {
    const puzzle = structuredClone(generatePuzzle(1, CORPUS))
    let tampered = false
    for (let r = 0; r < puzzle.rows && !tampered; r++) {
      for (let c = 0; c < puzzle.cols && !tampered; c++) {
        const hasNeighbour = puzzle.solution[r]?.[c - 1] || puzzle.solution[r - 1]?.[c]
        if (puzzle.solution[r]?.[c] === null && hasNeighbour) {
          ;(puzzle.solution[r] as (string | null)[])[c] = 'Z'
          tampered = true
        }
      }
    }
    expect(tampered).toBe(true)
    expect(validatePuzzle(puzzle).length).toBeGreaterThan(0)
  })

  it('detecta grade desconectada', () => {
    const puzzle = buildPuzzle(['CAT....', '.......', 'DOG....'], [
      { answer: 'CAT', row: 0, col: 0, direction: 'across' },
      { answer: 'DOG', row: 2, col: 0, direction: 'across' },
    ])
    expect(validatePuzzle(puzzle)).toContain('Grade desconectada.')
  })

  it('detecta resposta duplicada', () => {
    const puzzle = buildPuzzle(['CAT', 'A..', 'T..'], [
      { answer: 'CAT', row: 0, col: 0, direction: 'across' },
      { answer: 'CAT', row: 0, col: 0, direction: 'down' },
    ])
    expect(validatePuzzle(puzzle)).toContain('Resposta duplicada: CAT.')
  })

  it('aceita grade manual válida', () => {
    const puzzle = buildPuzzle(['SOL', 'A.U', 'LAS'], [
      { answer: 'SOL', row: 0, col: 0, direction: 'across' },
      { answer: 'SAL', row: 0, col: 0, direction: 'down' },
      { answer: 'LUS', row: 0, col: 2, direction: 'down' },
      { answer: 'LAS', row: 2, col: 0, direction: 'across' },
    ])
    expect(validatePuzzle(puzzle)).toEqual([])
  })
})

describe('repetibilidade', () => {
  it('mesma seed gera o mesmo jogo', () => {
    expect(generatePuzzle(123, CORPUS)).toEqual(generatePuzzle(123, CORPUS))
  })

  it('seeds diferentes geram jogos diferentes', () => {
    const solutions = new Set(
      Array.from({ length: 10 }, (_, i) => JSON.stringify(generatePuzzle(i + 1, CORPUS).solution)),
    )
    expect(solutions.size).toBeGreaterThanOrEqual(8)
  })

  it.each([9, 11, 13, 15])('gera jogo válido na grade %ix%i', (size) => {
    const puzzle = generatePuzzle(23, CORPUS, { size })
    expect(validatePuzzle(puzzle)).toEqual([])
    expect(puzzle.rows).toBeLessThanOrEqual(size)
    expect(puzzle.cols).toBeLessThanOrEqual(size)
    expect(puzzle.entries.length).toBeGreaterThanOrEqual(8)
  })

  it('falha com corpus insuficiente', () => {
    expect(() => generatePuzzle(1, [{ word: 'sol', clue: 'x' }])).toThrow()
  })
})