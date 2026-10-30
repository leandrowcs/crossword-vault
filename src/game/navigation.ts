import type { Direction, Entry, Puzzle } from '../engine/types'
import type { Game } from './play'

export interface Cell {
  row: number
  col: number
}

export interface Selection extends Cell {
  direction: Direction
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

export const isLetterCell = (puzzle: Puzzle, r: number, c: number): boolean =>
  (puzzle.solution[r]?.[c] ?? null) !== null

export function entryCells(entry: Entry): Cell[] {
  return Array.from({ length: entry.length }, (_, i) => ({
    row: entry.row + (entry.direction === 'down' ? i : 0),
    col: entry.col + (entry.direction === 'across' ? i : 0),
  }))
}

export function entryAt(puzzle: Puzzle, r: number, c: number, direction: Direction): Entry | null {
  return (
    puzzle.entries.find(
      (entry) =>
        entry.direction === direction &&
        entryCells(entry).some((cell) => cell.row === r && cell.col === c),
    ) ?? null
  )
}

export function resolveDirection(puzzle: Puzzle, r: number, c: number, preferred: Direction): Direction {
  if (entryAt(puzzle, r, c, preferred)) return preferred
  const other: Direction = preferred === 'across' ? 'down' : 'across'
  return entryAt(puzzle, r, c, other) ? other : preferred
}

export function stepInEntry(entry: Entry, r: number, c: number, delta: 1 | -1): Cell | null {
  const cells = entryCells(entry)
  const index = cells.findIndex((cell) => cell.row === r && cell.col === c)
  if (index < 0) return null
  return cells[index + delta] ?? null
}

export function orderedEntries(puzzle: Puzzle): Entry[] {
  const byNumber = (a: Entry, b: Entry) => a.number - b.number
  return [
    ...puzzle.entries.filter((entry) => entry.direction === 'across').sort(byNumber),
    ...puzzle.entries.filter((entry) => entry.direction === 'down').sort(byNumber),
  ]
}

export function nextEntry(puzzle: Puzzle, entry: Entry, delta: 1 | -1): Entry | null {
  const list = orderedEntries(puzzle)
  if (list.length === 0) return null
  const index = list.findIndex((item) => item.id === entry.id)
  const start = index < 0 ? 0 : index
  return list[(start + delta + list.length) % list.length] ?? null
}

export function firstEmptyCell(entry: Entry, game: Game): Cell {
  const cells = entryCells(entry)
  return cells.find((cell) => (game.input[cell.row]?.[cell.col] ?? '') === '') ?? (cells[0] as Cell)
}

export function moveSelection(puzzle: Puzzle, selection: Selection, arrow: ArrowKey): Selection {
  const dr = arrow === 'ArrowUp' ? -1 : arrow === 'ArrowDown' ? 1 : 0
  const dc = arrow === 'ArrowLeft' ? -1 : arrow === 'ArrowRight' ? 1 : 0
  let r = selection.row + dr
  let c = selection.col + dc
  while (r >= 0 && c >= 0 && r < puzzle.rows && c < puzzle.cols) {
    if (isLetterCell(puzzle, r, c)) return { ...selection, row: r, col: c }
    r += dr
    c += dc
  }
  return selection
}