import { assignNumbers, findRuns } from './numbering'
import { isValidAnswer, normalizeAnswer } from './normalize'
import { mulberry32, shuffle, type Rng } from './random'
import type { CorpusEntry, Direction, Entry, Puzzle } from './types'
import { validatePuzzle } from './validate'

export interface GeneratorOptions {
  size?: number
  targetWords?: number
}

interface Candidate {
  answer: string
  display: string
  clue: string
}

interface Placement {
  candidate: Candidate
  row: number
  col: number
  direction: Direction
}

interface Board {
  size: number
  letters: (string | null)[][]
  used: { across: boolean; down: boolean }[][]
}

const MAX_ATTEMPTS = 60
const MAX_PASSES = 3
const MIN_ACCEPTED_WORDS = 8

const createBoard = (size: number): Board => ({
  size,
  letters: Array.from({ length: size }, () => Array.from({ length: size }, () => null)),
  used: Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ across: false, down: false })),
  ),
})

const inBounds = (board: Board, r: number, c: number): boolean =>
  r >= 0 && c >= 0 && r < board.size && c < board.size

const letterAt = (board: Board, r: number, c: number): string | null =>
  inBounds(board, r, c) ? (board.letters[r]?.[c] ?? null) : null

const isEmpty = (board: Board, r: number, c: number): boolean => letterAt(board, r, c) === null

const stepOf = (direction: Direction): [number, number] =>
  direction === 'across' ? [0, 1] : [1, 0]

function crossingsFor(board: Board, answer: string, row: number, col: number, direction: Direction): number {
  const [dr, dc] = stepOf(direction)
  const endRow = row + dr * (answer.length - 1)
  const endCol = col + dc * (answer.length - 1)
  if (!inBounds(board, row, col) || !inBounds(board, endRow, endCol)) return -1
  if (!isEmpty(board, row - dr, col - dc)) return -1
  if (!isEmpty(board, endRow + dr, endCol + dc)) return -1
  let crossings = 0
  for (let i = 0; i < answer.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    const existing = letterAt(board, r, c)
    if (existing === null) {
      if (!isEmpty(board, r + dc, c + dr) || !isEmpty(board, r - dc, c - dr)) return -1
    } else {
      if (existing !== answer[i]) return -1
      if (board.used[r]?.[c]?.[direction]) return -1
      crossings++
    }
  }
  return crossings
}

function place(board: Board, placement: Placement): void {
  const [dr, dc] = stepOf(placement.direction)
  const { answer } = placement.candidate
  for (let i = 0; i < answer.length; i++) {
    const r = placement.row + dr * i
    const c = placement.col + dc * i
    const row = board.letters[r]
    const flags = board.used[r]?.[c]
    if (row) row[c] = answer[i] ?? null
    if (flags) flags[placement.direction] = true
  }
}

function bestPlacement(board: Board, candidate: Candidate, rng: Rng): Placement | null {
  const { answer } = candidate
  const seen = new Set<string>()
  let best: Placement | null = null
  let bestScore = -1
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const existing = letterAt(board, r, c)
      if (existing === null) continue
      for (let i = 0; i < answer.length; i++) {
        if (answer[i] !== existing) continue
        for (const direction of ['across', 'down'] as const) {
          const [dr, dc] = stepOf(direction)
          const row = r - dr * i
          const col = c - dc * i
          const key = `${row}:${col}:${direction}`
          if (seen.has(key)) continue
          seen.add(key)
          const crossings = crossingsFor(board, answer, row, col, direction)
          if (crossings < 1) continue
          const score = crossings * 100 + rng() * 10
          if (score > bestScore) {
            bestScore = score
            best = { candidate, row, col, direction }
          }
        }
      }
    }
  }
  return best
}

function buildPool(corpus: readonly CorpusEntry[], size: number): Candidate[] {
  const seen = new Set<string>()
  const pool: Candidate[] = []
  for (const entry of corpus) {
    if (!isValidAnswer(entry.word)) continue
    const answer = normalizeAnswer(entry.word)
    if (answer.length > size || seen.has(answer)) continue
    seen.add(answer)
    pool.push({ answer, display: entry.word, clue: entry.clue })
  }
  return pool
}

function attemptPuzzle(seed: number, attempt: number, pool: readonly Candidate[], size: number, target: number): Puzzle | null {
  const rng = mulberry32((seed + attempt * 0x9e3779b1) >>> 0)
  const shuffled = shuffle(pool, rng)
  const firstIndex = Math.max(
    0,
    shuffled.findIndex((candidate) => candidate.answer.length >= 6),
  )
  const first = shuffled[firstIndex]
  if (!first) return null
  const remaining = shuffled.filter((_, index) => index !== firstIndex)
  const board = createBoard(size)
  const placements: Placement[] = []
  const start: Placement = {
    candidate: first,
    row: Math.floor(size / 2),
    col: Math.floor((size - first.answer.length) / 2),
    direction: 'across',
  }
  place(board, start)
  placements.push(start)

  const used = new Set<string>([first.answer])
  for (let pass = 0; pass < MAX_PASSES && placements.length < target; pass++) {
    for (const candidate of remaining) {
      if (placements.length >= target) break
      if (used.has(candidate.answer)) continue
      const placement = bestPlacement(board, candidate, rng)
      if (!placement) continue
      place(board, placement)
      placements.push(placement)
      used.add(candidate.answer)
    }
  }

  let minRow = size
  let maxRow = -1
  let minCol = size
  let maxCol = -1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board.letters[r]?.[c] == null) continue
      minRow = Math.min(minRow, r)
      maxRow = Math.max(maxRow, r)
      minCol = Math.min(minCol, c)
      maxCol = Math.max(maxCol, c)
    }
  }
  if (maxRow < 0) return null

  const rows = maxRow - minRow + 1
  const cols = maxCol - minCol + 1
  const solution = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => board.letters[r + minRow]?.[c + minCol] ?? null),
  )
  const runs = findRuns(solution)
  const numbers = assignNumbers(runs, rows, cols)
  const entries: Entry[] = []
  for (const run of runs) {
    const match = placements.find(
      (p) => p.row - minRow === run.row && p.col - minCol === run.col && p.direction === run.direction,
    )
    if (!match) continue
    const number = numbers[run.row]?.[run.col]
    if (!number) continue
    entries.push({
      id: `${number}${run.direction === 'across' ? 'A' : 'D'}`,
      number,
      direction: run.direction,
      row: run.row,
      col: run.col,
      length: run.length,
      answer: match.candidate.answer,
      display: match.candidate.display,
      clue: match.candidate.clue,
    })
  }
  return { seed, rows, cols, solution, numbers, entries }
}

export function generatePuzzle(seed: number, corpus: readonly CorpusEntry[], options: GeneratorOptions = {}): Puzzle {
  const size = options.size ?? 15
  const targetWords = options.targetWords ?? 14
  const normalizedSeed = seed >>> 0
  const pool = buildPool(corpus, size)
  if (pool.length < 2) throw new Error('Corpus insuficiente para gerar o jogo.')
  const accepted = Math.min(targetWords, MIN_ACCEPTED_WORDS)
  let best: Puzzle | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = attemptPuzzle(normalizedSeed, attempt, pool, size, targetWords)
    if (!puzzle || validatePuzzle(puzzle).length > 0) continue
    if (puzzle.entries.length >= accepted) return puzzle
    if (!best || puzzle.entries.length > best.entries.length) best = puzzle
  }
  if (!best) throw new Error('Nao foi possivel gerar um jogo valido.')
  return best
}