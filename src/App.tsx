import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
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
  const [view, setView] = useState<'home' | 'game'>('home')
  const [newGameSize, setNewGameSize] = useState<BoardSize>(11)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { status } = game
  const session = status.kind === 'ready' ? status.session : null
  const selectionKey = session ? `${session.selection.row}:${session.selection.col}:${session.selection.direction}` : ''

  useEffect(() => {
    if (view !== 'game' || !selectionKey) return
    const activeElement = document.activeElement
    if (activeElement === boardRef.current || activeElement === inputRef.current) return
    if (activeElement?.getAttribute('role') === 'gridcell') {
      inputRef.current?.focus({ preventScroll: true })
      return
    }
    boardRef.current?.focus({ preventScroll: true })
  }, [selectionKey, view])

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
  const startNewGame = () => {
    if (
      session.isResumable &&
      stats.filled > 0 &&
      !complete &&
      !window.confirm('Começar um novo jogo? O progresso atual será perdido.')
    ) {
      return
    }
    game.restart(newGameSize)
    setView('game')
  }

  if (view === 'home') {
    const fastest = game.summary.fastestMs
    return (
      <main className="app home">
        {game.persistenceWarning ? <p className="storage-warning" role="alert">{game.persistenceWarning}</p> : null}
        <header className="home-header">
          <img
            src="/icons/crossword-vault-logo.svg"
            alt=""
            width="72"
            height="72"
          />
          <h1>
            Palavras Cruzadas <span className="accent">Vault</span>
          </h1>
          <p>Seu próximo desafio de palavras começa aqui.</p>
        </header>

        <section className="home-actions" aria-labelledby="home-title">
          <h2 id="home-title">Jogar</h2>
          {session.isResumable ? (
            <button
              type="button"
              className="btn btn-primary home-button"
              onClick={() => {
                game.activate()
                setView('game')
              }}
            >
              Continuar partida
            </button>
          ) : null}
          <label className="difficulty home-difficulty">
            Dificuldade da nova partida
            <select
              aria-label="Dificuldade da nova partida"
              value={newGameSize}
              onChange={(event) => {
                const size = Number(event.currentTarget.value)
                if (isBoardSize(size)) setNewGameSize(size)
              }}
            >
              <option value={9}>Fácil · 9×9</option>
              <option value={11}>Normal · 11×11</option>
              <option value={13}>Difícil · 13×13</option>
              <option value={15}>Especial · 15×15</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary home-button" onClick={startNewGame}>
            {session.isResumable ? 'Nova partida' : 'Começar jogo'}
          </button>
        </section>

        <section className="home-stats" aria-labelledby="stats-title">
          <h2 id="stats-title">Estatísticas</h2>
          {game.summary.started === 0 ? (
            <p className="muted">Suas partidas concluídas aparecerão aqui.</p>
          ) : (
            <>
              <dl className="stats-grid">
                <div><dt>Iniciadas</dt><dd>{game.summary.started}</dd></div>
                <div><dt>Concluídas</dt><dd>{game.summary.completed}</dd></div>
                <div><dt>Com ajuda</dt><dd>{game.summary.assisted}</dd></div>
                <div>
                  <dt>Recorde</dt>
                  <dd>{fastest === null ? '—' : formatDuration(fastest)}</dd>
                </div>
              </dl>
              <h3>Partidas recentes</h3>
              <ol className="history-list">
                {[...game.history].reverse().slice(0, 8).map((record) => (
                  <li key={record.id}>
                    <span>{difficultyName(record.size)} · {record.completedAt ? 'Concluída' : 'Não concluída'}</span>
                    <time dateTime={new Date(record.completedAt ?? record.startedAt).toISOString()}>
                      {new Date(record.completedAt ?? record.startedAt).toLocaleDateString('pt-BR')}
                    </time>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </main>
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const { key } = event
    if (ARROWS.includes(key)) {
      event.preventDefault()
      game.arrow(key as ArrowKey)
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      game.toggleDirection()
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

  const percent = stats.total === 0 ? 0 : Math.round((stats.filled / stats.total) * 100)

  return (
    <main className="app">
      {game.persistenceWarning ? <p className="storage-warning" role="alert">{game.persistenceWarning}</p> : null}
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
        onNewGame={() => handleNewGame()}
        onHome={() => setView('home')}
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
          boardRef={boardRef}
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

const difficultyName = (size: BoardSize): string =>
  ({ 9: 'Fácil', 11: 'Normal', 13: 'Difícil', 15: 'Especial' })[size]

const formatDuration = (durationMs: number): string => {
  const seconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`
}