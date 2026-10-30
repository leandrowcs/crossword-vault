import type { Entry, Puzzle } from '../engine/types'

export interface Game {
  input: string[][]
  revealed: boolean[][]
  flagged: boolean[][]
}

export interface Progress {
  filled: number
  total: number
  correct: number
}

const grid = <T>(puzzle: Puzzle, value: T): T[][] =>
  Array.from({ length: puzzle.rows }, () => Array.from({ length: puzzle.cols }, () => value))

const solutionAt = (puzzle: Puzzle, r: number, c: number): string | null =>
  puzzle.solution[r]?.[c] ?? null

const updateGrid = <T>(source: readonly (readonly T[])[], r: number, c: number, value: T): T[][] =>
  source.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : [...row]))

export function createGame(puzzle: Puzzle): Game {
  return {
    input: grid(puzzle, ''),
    revealed: grid(puzzle, false),
    flagged: grid(puzzle, false),
  }
}

export function setLetter(game: Game, puzzle: Puzzle, r: number, c: number, letter: string): Game {
  if (solutionAt(puzzle, r, c) === null || game.revealed[r]?.[c]) return game
  if (!/^[A-Z]$/.test(letter)) return game
  return {
    ...game,
    input: updateGrid(game.input, r, c, letter),
    flagged: updateGrid(game.flagged, r, c, false),
  }
}

export function clearCell(game: Game, puzzle: Puzzle, r: number, c: number): Game {
  if (solutionAt(puzzle, r, c) === null || game.revealed[r]?.[c]) return game
  return {
    ...game,
    input: updateGrid(game.input, r, c, ''),
    flagged: updateGrid(game.flagged, r, c, false),
  }
}

export function revealCell(game: Game, puzzle: Puzzle, r: number, c: number): Game {
  const letter = solutionAt(puzzle, r, c)
  if (letter === null) return game
  return {
    input: updateGrid(game.input, r, c, letter),
    revealed: updateGrid(game.revealed, r, c, true),
    flagged: updateGrid(game.flagged, r, c, false),
  }
}

export function revealEntry(game: Game, puzzle: Puzzle, entry: Entry): Game {
  let next = game
  for (let i = 0; i < entry.length; i++) {
    const r = entry.row + (entry.direction === 'down' ? i : 0)
    const c = entry.col + (entry.direction === 'across' ? i : 0)
    next = revealCell(next, puzzle, r, c)
  }
  return next
}

export function revealAll(game: Game, puzzle: Puzzle): Game {
  const revealed = puzzle.solution.map((row) => row.map((cell) => cell !== null))
  return {
    input: puzzle.solution.map((row) => row.map((cell) => cell ?? '')),
    revealed: revealed.map((row, r) => row.map((value, c) => value || (game.revealed[r]?.[c] ?? false))),
    flagged: grid(puzzle, false),
  }
}

export function checkAll(game: Game, puzzle: Puzzle): Game {
  return {
    ...game,
    flagged: puzzle.solution.map((row, r) =>
      row.map((solution, c) => {
        const value = game.input[r]?.[c] ?? ''
        return solution !== null && value !== '' && value !== solution
      }),
    ),
  }
}

export function isComplete(game: Game, puzzle: Puzzle): boolean {
  let letters = 0
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const solution = solutionAt(puzzle, r, c)
      if (solution === null) continue
      letters++
      if (game.input[r]?.[c] !== solution) return false
    }
  }
  return letters > 0
}

export function progress(game: Game, puzzle: Puzzle): Progress {
  let filled = 0
  let total = 0
  let correct = 0
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const solution = solutionAt(puzzle, r, c)
      if (solution === null) continue
      total++
      const value = game.input[r]?.[c] ?? ''
      if (value !== '') filled++
      if (value === solution) correct++
    }
  }
  return { filled, total, correct }
}

export function usedHelp(game: Game): boolean {
  return game.revealed.some((row) => row.some(Boolean))
}