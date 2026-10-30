import { useEffect, useMemo, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { Board } from './components/Board'
import { CluePanel } from './components/CluePanel'
import { Toolbar } from './components/Toolbar'
import { normalizeAnswer } from './engine/normalize'
import { entryAt, isComplete, progress, usedHelp, type ArrowKey } from './game'
import { useCrosswordGame } from './useCrosswordGame'

const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
const BOARD_SIZES = [9, 11, 13, 15] as const
type BoardSize = (typeof BOARD_SIZES)[number]

const isBoardSize = (size: number): size is BoardSize =>
  BOARD_SIZES.some((supportedSize) => supportedSize === size)

export default function App() {
  const game = useCrosswordGame()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { status } = game
  const session = status.kind === 'ready' ? status.session : null
  const selectionKey = session ? `${session.selection.row}:${session.selection.col}:${session.selection.direction}` : ''

  useEffect(() => {
    if (selectionKey) inputRef.current?.focus({ preventScroll: true })
  }, [selectionKey])

  const derived = useMemo(() => {
    if (!session) return null
    const { puzzle, game: state, selection } = session
    return {
      activeEntry: entryAt(puzzle, selection.row, selection.col, selection.direction),
      across: puzzle.entries.filter((e) => e.direction === 'across').sort((a, b) => a.number - b.number),
      down: puzzle.entries.filter((e) => e.direction === 'down').sort((a, b) => a.number - b.number),
      stats: progress(state, puzzle),
      complete: isComplete(state, puzzle),
      helped: usedHelp(state),
    }
  }, [session])

  if (status.kind === 'loading') {
    return (
      <main className="app app-center" aria-busy="true">
        <p className="state-message" role="status">
          Preparando o cofre de palavras…
        </p>
      </main>
    )
  }

  if (status.kind === 'error' || !session || !derived) {
    return (
      <main className="app app-center">
        <div className="state-message" role="alert">
          <p>Não foi possível gerar o jogo.</p>
          {status.kind === 'error' ? <p className="muted">{status.message}</p> : null}
          <button type="button" className="btn btn-primary" onClick={() => game.retry()}>
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  const { puzzle, game: state } = session
  const { activeEntry, across, down, stats, complete, helped } = derived

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const { key } = event
    if (ARROWS.includes(key)) {
      event.preventDefault()
      game.arrow(key as ArrowKey)
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      game.toggleDirection()
    } else if (key === 'Tab') {
      event.preventDefault()
      game.cycleEntry(event.shiftKey ? -1 : 1)
    } else if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      game.backspace()
    } else if (key.length === 1) {
      const letter = normalizeAnswer(key)
      if (letter.length === 1) {
        event.preventDefault()
        game.typeLetter(letter)
      }
    }
  }

  const handleTextInput = (event: ChangeEvent<HTMLInputElement>) => {
    const last = Array.from(event.target.value).pop() ?? ''
    const letter = normalizeAnswer(last)
    if (letter.length === 1) game.typeLetter(letter)
  }

  const handleNewGame = (size: BoardSize = session.boardSize) => {
    if (stats.filled === 0 || complete || window.confirm('Começar um novo jogo? O progresso atual será perdido.')) {
      game.restart(size)
    }
  }

  const handleDifficultyChange = (value: string) => {
    const size = Number(value)
    if (isBoardSize(size)) handleNewGame(size)
  }

  const handleRevealAll = () => {
    if (window.confirm('Revelar todas as respostas?')) game.revealEverything()
  }

  const percent = stats.total === 0 ? 0 : Math.round((stats.filled / stats.total) * 100)

  return (
    <main className="app">
      <header className="header">
        <h1>
          Palavras Cruzadas <span className="accent">Vault</span>
        </h1>
        <div className="meta">
          <label className="difficulty">
            Dificuldade
            <select
              aria-label="Dificuldade"
              value={session.boardSize}
              onChange={(event) => handleDifficultyChange(event.currentTarget.value)}
            >
              <option value={9}>Fácil · 9×9</option>
              <option value={11}>Normal · 11×11</option>
              <option value={13}>Difícil · 13×13</option>
              <option value={15}>Especial · 15×15</option>
            </select>
          </label>
          <span title="Código do jogo">
            Código <strong>{puzzle.seed.toString(36).toUpperCase()}</strong>
          </span>
          <span>
            Progresso{' '}
            <strong>
              {stats.filled}/{stats.total}
            </strong>
          </span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Progresso do jogo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </header>

      {complete ? (
        <div className="banner" role="status">
          <strong>Cofre aberto! Parabéns, você completou o jogo.</strong>
          {helped ? <span> Algumas letras foram reveladas com ajuda.</span> : null}
        </div>
      ) : null}
      <Toolbar
        onCheck={game.check}
        onRevealLetter={game.revealLetter}
        onRevealWord={game.revealWord}
        onRevealAll={handleRevealAll}
        onNewGame={() => handleNewGame()}
      />

      <div className="active-clue" aria-live="polite">
        {activeEntry ? (
          <>
            <span className="active-clue-tag">
              {activeEntry.number} {activeEntry.direction === 'across' ? 'Horizontal' : 'Vertical'}
            </span>
            <span>
              {activeEntry.clue} ({activeEntry.length})
            </span>
          </>
        ) : (
          <span className="muted">Selecione uma célula.</span>
        )}
      </div>

      <div className="layout">
        <Board
          puzzle={puzzle}
          game={state}
          selection={session.selection}
          activeEntry={activeEntry}
          inputRef={inputRef}
          onSelect={game.select}
          onKeyDown={handleKeyDown}
          onTextInput={handleTextInput}
        />
        <div className="clues">
          <CluePanel
            across={across}
            down={down}
            activeId={activeEntry?.id ?? null}
            activeDirection={session.selection.direction}
            game={state}
            onSelect={game.selectEntry}
          />
        </div>
      </div>
    </main>
  )
}