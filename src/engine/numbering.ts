import type { Run } from './types'

type Cells = readonly (readonly (string | null)[])[]

const isLetter = (cells: Cells, r: number, c: number): boolean => {
  const value = cells[r]?.[c]
  return typeof value === 'string' && value.length > 0
}

export function findRuns(cells: Cells): Run[] {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const runs: Run[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isLetter(cells, r, c)) continue
      if (!isLetter(cells, r, c - 1)) {
        let length = 0
        while (isLetter(cells, r, c + length)) length++
        if (length >= 2) runs.push({ row: r, col: c, direction: 'across', length })
      }
      if (!isLetter(cells, r - 1, c)) {
        let length = 0
        while (isLetter(cells, r + length, c)) length++
        if (length >= 2) runs.push({ row: r, col: c, direction: 'down', length })
      }
    }
  }
  return runs
}

export function assignNumbers(
  runs: readonly Run[],
  rows: number,
  cols: number,
): (number | null)[][] {
  const grid: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  )
  const starts = new Set(runs.map((run) => run.row * cols + run.col))
  let next = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (starts.has(r * cols + c)) {
        const row = grid[r]
        if (row) row[c] = next++
      }
    }
  }
  return grid
}