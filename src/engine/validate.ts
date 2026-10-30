import { normalizeAnswer } from './normalize'
import { assignNumbers, findRuns } from './numbering'
import type { Puzzle } from './types'

const isLetterCell = (puzzle: Puzzle, r: number, c: number): boolean => {
  const value = puzzle.solution[r]?.[c]
  return typeof value === 'string' && value.length > 0
}

export function validatePuzzle(puzzle: Puzzle): string[] {
  const errors: string[] = []
  const { rows, cols, solution, entries } = puzzle

  if (solution.length !== rows || solution.some((row) => row.length !== cols)) {
    errors.push('Dimensoes da solucao invalidas.')
    return errors
  }
  if (puzzle.numbers.length !== rows || puzzle.numbers.some((row) => row.length !== cols)) {
    errors.push('Dimensoes da numeracao invalidas.')
    return errors
  }

  const ids = new Set<string>()
  const answers = new Set<string>()
  const entryKeys = new Map<string, number>()
  const covered = new Set<number>()

  for (const entry of entries) {
    if (ids.has(entry.id)) errors.push(`Id duplicado: ${entry.id}.`)
    ids.add(entry.id)
    if (answers.has(entry.answer)) errors.push(`Resposta duplicada: ${entry.answer}.`)
    answers.add(entry.answer)
    if (entry.answer !== normalizeAnswer(entry.display)) {
      errors.push(`Resposta diferente do texto exibido: ${entry.id}.`)
    }
    if (entry.answer.length !== entry.length) errors.push(`Tamanho inconsistente: ${entry.id}.`)

    const dr = entry.direction === 'down' ? 1 : 0
    const dc = entry.direction === 'across' ? 1 : 0
    const endRow = entry.row + dr * (entry.length - 1)
    const endCol = entry.col + dc * (entry.length - 1)
    if (
      entry.row < 0 || entry.col < 0 || entry.length < 2 ||
      endRow >= rows || endCol >= cols
    ) {
      errors.push(`Entrada fora dos limites: ${entry.id}.`)
      continue
    }
    for (let i = 0; i < entry.length; i++) {
      const r = entry.row + dr * i
      const c = entry.col + dc * i
      if (solution[r]?.[c] !== entry.answer[i]) {
        errors.push(`Letra divergente em ${entry.id} (${r},${c}).`)
      }
      covered.add(r * cols + c)
    }
    const key = `${entry.row}:${entry.col}:${entry.direction}:${entry.length}`
    entryKeys.set(key, (entryKeys.get(key) ?? 0) + 1)
  }

  const runs = findRuns(solution)
  const runKeys = new Set<string>()
  for (const run of runs) {
    const key = `${run.row}:${run.col}:${run.direction}:${run.length}`
    runKeys.add(key)
    const count = entryKeys.get(key) ?? 0
    if (count !== 1) errors.push(`Sequencia sem entrada correspondente unica: ${key}.`)
  }
  for (const key of entryKeys.keys()) {
    if (!runKeys.has(key)) errors.push(`Entrada sem sequencia correspondente: ${key}.`)
  }

  const letters: number[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isLetterCell(puzzle, r, c)) continue
      letters.push(r * cols + c)
      if (!covered.has(r * cols + c)) errors.push(`Letra orfa em (${r},${c}).`)
    }
  }

  const first = letters[0]
  if (first === undefined) {
    errors.push('Grade vazia.')
  } else {
    const visited = new Set<number>([first])
    const queue = [first]
    while (queue.length > 0) {
      const current = queue.pop() as number
      const r = Math.floor(current / cols)
      const c = current % cols
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as const) {
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
        const index = nr * cols + nc
        if (visited.has(index) || !isLetterCell(puzzle, nr, nc)) continue
        visited.add(index)
        queue.push(index)
      }
    }
    if (visited.size !== letters.length) errors.push('Grade desconectada.')
  }

  const expected = assignNumbers(runs, rows, cols)
  if (JSON.stringify(expected) !== JSON.stringify(puzzle.numbers)) {
    errors.push('Numeracao inconsistente.')
  }
  for (const entry of entries) {
    if (puzzle.numbers[entry.row]?.[entry.col] !== entry.number) {
      errors.push(`Numero inconsistente em ${entry.id}.`)
    }
  }

  return errors
}