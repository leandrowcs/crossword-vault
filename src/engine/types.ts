export type Direction = 'across' | 'down'

export interface CorpusEntry {
  word: string
  clue: string
}

export interface Entry {
  id: string
  number: number
  direction: Direction
  row: number
  col: number
  length: number
  answer: string
  display: string
  clue: string
}

export interface Puzzle {
  seed: number
  rows: number
  cols: number
  solution: (string | null)[][]
  numbers: (number | null)[][]
  entries: Entry[]
}

export interface Run {
  row: number
  col: number
  direction: Direction
  length: number
}