import { useCallback, useEffect, useState } from 'react'
import { CORPUS, CORPUS_VERSION } from './data/corpus'
import { generatePuzzle } from './engine/generator'
import type { Direction, Entry, Puzzle } from './engine/types'
import {
  checkAll,
  clearCell,
  clearSave,
  completeGame,
  createGame,
  ensureGameStarted,
  entryAt,
  firstEmptyCell,
  moveSelection,
  nextEntry,
  orderedEntries,
  readSave,
  readHistory,
  resolveDirection,
  restoreGame,
  revealCell,
  revealEntry,
  saveGame,
  summarizeHistory,
  setLetter,
  stepInEntry,
  writeHistory,
  isComplete,
  usedHelp,
  type ArrowKey,
  type Game,
  type GameRecord,
  type Selection,
  type StorageLike,
} from './game'

export interface Session {
  puzzle: Puzzle
  game: Game
  selection: Selection
  boardSize: 9 | 11 | 13 | 15
  startedAt: number
  isStarted: boolean
  isResumable: boolean
}

type BoardSize = Session['boardSize']

export type Status =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: Session }

const getStorage = (): StorageLike | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const randomSeed = (): number => {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] ?? Date.now() >>> 0
}

const initialSelection = (puzzle: Puzzle, game: Game): Selection => {
  const first = orderedEntries(puzzle)[0]
  if (!first) return { row: 0, col: 0, direction: 'across' }
  const cell = firstEmptyCell(first, game)
  return { ...cell, direction: first.direction }
}

const otherDirection = (direction: Direction): Direction => (direction === 'across' ? 'down' : 'across')

const loadSession = (forceNew: boolean, requestedSize?: BoardSize, activate = false): Session => {
  const storage = getStorage()
  if (forceNew && storage) clearSave(storage)
  const save = !forceNew && storage ? readSave(storage) : null
  const reusable = save && save.corpusVersion === CORPUS_VERSION ? save : null
  const boardSize = requestedSize ?? reusable?.size ?? 11
  const puzzle = generatePuzzle(reusable ? reusable.seed : randomSeed(), CORPUS, { size: boardSize })
  const restored = reusable ? restoreGame(puzzle, reusable) : null
  const game = restored ?? createGame(puzzle)
  const isResumable = restored !== null
  const startedAt = isResumable ? reusable?.startedAt ?? reusable?.savedAt ?? Date.now() : Date.now()
  return {
    puzzle,
    game,
    selection: initialSelection(puzzle, game),
    boardSize,
    startedAt,
    isStarted: activate || isResumable,
    isResumable: activate || isResumable,
  }
}

export function useCrosswordGame() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [history, setHistory] = useState<GameRecord[]>(() => {
    const storage = getStorage()
    return storage ? readHistory(storage) : []
  })
  const [saveFailed, setSaveFailed] = useState(false)
  const [historySaveFailed, setHistorySaveFailed] = useState(false)

  const start = useCallback((forceNew: boolean, size?: BoardSize, activate = false) => {
    try {
      setStatus({ kind: 'ready', session: loadSession(forceNew, size, activate) })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Falha ao gerar o jogo.',
      })
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => start(false), 0)
    return () => window.clearTimeout(id)
  }, [start])

  useEffect(() => {
    if (status.kind !== 'ready') return
    const storage = getStorage()
    if (status.session.isStarted) {
      if (!storage) {
        setSaveFailed(true)
      } else {
        setSaveFailed(
          !saveGame(
            storage,
            status.session.puzzle,
            status.session.game,
            CORPUS_VERSION,
            Date.now(),
            status.session.boardSize,
            status.session.startedAt,
          ),
        )
      }
    }
    if (!status.session.isStarted) return
    const { puzzle, boardSize, startedAt, game } = status.session
    const id = `${boardSize}:${puzzle.seed}:${startedAt}`
    const record: GameRecord = {
      id,
      seed: puzzle.seed,
      size: boardSize,
      startedAt,
      completedAt: null,
      assisted: false,
    }
    setHistory((previous) => {
      const started = ensureGameStarted(previous, record)
      return isComplete(game, puzzle)
        ? completeGame(started, id, Date.now(), usedHelp(game))
        : started
    })
  }, [status])

  useEffect(() => {
    const storage = getStorage()
    if (!storage) {
      if (history.length > 0) setHistorySaveFailed(true)
      return
    }
    setHistorySaveFailed(!writeHistory(storage, history))
  }, [history])

  const update = useCallback((fn: (session: Session) => Session) => {
    setStatus((previous) =>
      previous.kind === 'ready' ? { kind: 'ready', session: fn(previous.session) } : previous,
    )
  }, [])

  const restart = useCallback((size: BoardSize = 11) => {
    setStatus({ kind: 'loading' })
    window.setTimeout(() => start(true, size, true), 0)
  }, [start])

  const activate = useCallback(() => {
    update((session) => (session.isStarted ? session : { ...session, isStarted: true }))
  }, [update])

  const select = useCallback(
    (row: number, col: number) =>
      update((s) => {
        if ((s.puzzle.solution[row]?.[col] ?? null) === null) return s
        const same = s.selection.row === row && s.selection.col === col
        const direction = same
          ? resolveDirection(s.puzzle, row, col, otherDirection(s.selection.direction))
          : resolveDirection(s.puzzle, row, col, s.selection.direction)
        return { ...s, selection: { row, col, direction } }
      }),
    [update],
  )

  const selectEntry = useCallback(
    (entry: Entry) =>
      update((s) => ({
        ...s,
        selection: { ...firstEmptyCell(entry, s.game), direction: entry.direction },
      })),
    [update],
  )

  const toggleDirection = useCallback(
    () =>
      update((s) => {
        const { row, col, direction } = s.selection
        return {
          ...s,
          selection: { row, col, direction: resolveDirection(s.puzzle, row, col, otherDirection(direction)) },
        }
      }),
    [update],
  )

  const typeLetter = useCallback(
    (letter: string) =>
      update((s) => {
        const { puzzle, game, selection } = s
        const entry = entryAt(puzzle, selection.row, selection.col, selection.direction)
        const step = entry ? stepInEntry(entry, selection.row, selection.col, 1) : null
        return {
          ...s,
          game: setLetter(game, puzzle, selection.row, selection.col, letter),
          selection: step ? { ...selection, ...step } : selection,
        }
      }),
    [update],
  )

  const backspace = useCallback(
    () =>
      update((s) => {
        const { puzzle, game, selection } = s
        const { row, col } = selection
        const current = game.input[row]?.[col] ?? ''
        if (current !== '' && !game.revealed[row]?.[col]) {
          return { ...s, game: clearCell(game, puzzle, row, col) }
        }
        const entry = entryAt(puzzle, row, col, selection.direction)
        const previous = entry ? stepInEntry(entry, row, col, -1) : null
        if (!previous) return s
        return {
          ...s,
          game: clearCell(game, puzzle, previous.row, previous.col),
          selection: { ...selection, ...previous },
        }
      }),
    [update],
  )

  const arrow = useCallback(
    (key: ArrowKey) =>
      update((s) => {
        const moved = moveSelection(s.puzzle, s.selection, key)
        return {
          ...s,
          selection: {
            ...moved,
            direction: resolveDirection(s.puzzle, moved.row, moved.col, moved.direction),
          },
        }
      }),
    [update],
  )

  const cycleEntry = useCallback(
    (delta: 1 | -1) =>
      update((s) => {
        const current =
          entryAt(s.puzzle, s.selection.row, s.selection.col, s.selection.direction) ??
          orderedEntries(s.puzzle)[0]
        if (!current) return s
        const target = nextEntry(s.puzzle, current, delta)
        if (!target) return s
        return {
          ...s,
          selection: { ...firstEmptyCell(target, s.game), direction: target.direction },
        }
      }),
    [update],
  )

  const check = useCallback(() => update((s) => ({ ...s, game: checkAll(s.game, s.puzzle) })), [update])

  const revealLetter = useCallback(
    () =>
      update((s) => ({
        ...s,
        game: revealCell(s.game, s.puzzle, s.selection.row, s.selection.col),
      })),
    [update],
  )

  const revealWord = useCallback(
    () =>
      update((s) => {
        const entry = entryAt(s.puzzle, s.selection.row, s.selection.col, s.selection.direction)
        return entry ? { ...s, game: revealEntry(s.game, s.puzzle, entry) } : s
      }),
    [update],
  )

  return {
    status,
    history,
    summary: summarizeHistory(history),
    persistenceWarning:
      saveFailed || historySaveFailed
        ? 'Não foi possível salvar neste navegador. Seu progresso pode ser perdido.'
        : null,
    retry: restart,
    restart,
    activate,
    select,
    selectEntry,
    toggleDirection,
    typeLetter,
    backspace,
    arrow,
    cycleEntry,
    check,
    revealLetter,
    revealWord,
  }
}