import { useEffect, useState } from 'react'
import type { Direction, Entry } from '../engine/types'
import { entryCells, type Game } from '../game'

interface CluePanelProps {
  across: Entry[]
  down: Entry[]
  activeId: string | null
  activeDirection: Direction
  game: Game
  onSelect: (entry: Entry) => void
}

const TABS: ReadonlyArray<{ direction: Direction; label: string }> = [
  { direction: 'across', label: 'Horizontais' },
  { direction: 'down', label: 'Verticais' },
]

const isFilled = (entry: Entry, game: Game): boolean =>
  entryCells(entry).every((cell) => (game.input[cell.row]?.[cell.col] ?? '') !== '')

export function CluePanel({ across, down, activeId, activeDirection, game, onSelect }: CluePanelProps) {
  const [tab, setTab] = useState<Direction>(activeDirection)

  useEffect(() => {
    setTab(activeDirection)
  }, [activeDirection])

  const entries = tab === 'across' ? across : down

  return (
    <section className="clue-panel" aria-label="Pistas">
      <div className="clue-tabs" role="tablist" aria-label="Direção das pistas">
        {TABS.map(({ direction, label }) => (
          <button
            key={direction}
            type="button"
            role="tab"
            id={`tab-${direction}`}
            aria-selected={tab === direction}
            aria-controls="clue-tabpanel"
            className={`clue-tab${tab === direction ? ' active' : ''}`}
            tabIndex={tab === direction ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault()
                const nextDirection = direction === 'across' ? 'down' : 'across'
                setTab(nextDirection)
                document.getElementById(`tab-${nextDirection}`)?.focus()
              }
              if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault()
                const target = event.key === 'Home' ? TABS[0] : TABS[TABS.length - 1]
                if (target) {
                  setTab(target.direction)
                  document.getElementById(`tab-${target.direction}`)?.focus()
                }
              }
            }}
            onClick={() => setTab(direction)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="clue-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {entries.length === 0 ? (
          <p className="muted">Nenhuma pista.</p>
        ) : (
          <ol className="clue-list">
            {entries.map((entry) => {
              const active = entry.id === activeId
              const classes = ['clue']
              if (active) classes.push('active')
              if (isFilled(entry, game)) classes.push('done')
              return (
                <li key={entry.id} className={classes.join(' ')}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(entry)}
                  >
                    <span className="clue-number">{entry.number}</span>
                    <span className="clue-text">
                      {entry.clue} <span className="clue-length">({entry.length})</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}