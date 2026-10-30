import { useEffect, useRef } from 'react'
import type { Entry } from '../engine/types'
import { entryCells, type Game } from '../game'

interface CluePanelProps {
  title: string
  entries: Entry[]
  activeId: string | null
  game: Game
  onSelect: (entry: Entry) => void
}

const isFilled = (entry: Entry, game: Game): boolean =>
  entryCells(entry).every((cell) => (game.input[cell.row]?.[cell.col] ?? '') !== '')

export function CluePanel({ title, entries, activeId, game, onSelect }: CluePanelProps) {
  const activeRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <section className="clue-panel" aria-label={title}>
      <h2>{title}</h2>
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
              <li key={entry.id} ref={active ? activeRef : null} className={classes.join(' ')}>
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
    </section>
  )
}