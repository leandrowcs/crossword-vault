import type { ChangeEvent, KeyboardEvent, Ref } from 'react'
import type { Puzzle } from '../engine/types'
import { entryCells, type Game, type Selection } from '../game'
import type { Entry } from '../engine/types'

interface BoardProps {
  puzzle: Puzzle
  game: Game
  selection: Selection
  activeEntry: Entry | null
  inputRef: Ref<HTMLInputElement>
  onSelect: (row: number, col: number) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onTextInput: (event: ChangeEvent<HTMLInputElement>) => void
}

export function Board({
  puzzle,
  game,
  selection,
  activeEntry,
  inputRef,
  onSelect,
  onKeyDown,
  onTextInput,
}: BoardProps) {
  const activeKeys = new Set(activeEntry ? entryCells(activeEntry).map((c) => `${c.row}:${c.col}`) : [])

  return (
    <div className="board-wrap">
      <div
        className="board"
        role="grid"
        aria-label="Grade de palavras cruzadas"
        style={{ '--cols': puzzle.cols, '--rows': puzzle.rows } as React.CSSProperties}
      >
        {puzzle.solution.map((row, r) =>
          row.map((solution, c) => {
            if (solution === null) {
              return <div key={`${r}:${c}`} className="cell cell-block" role="presentation" />
            }
            const isSelected = selection.row === r && selection.col === c
            const classes = ['cell', 'cell-letter']
            if (activeKeys.has(`${r}:${c}`)) classes.push('in-word')
            if (isSelected) classes.push('selected')
            if (game.flagged[r]?.[c]) classes.push('flagged')
            if (game.revealed[r]?.[c]) classes.push('revealed')
            const number = puzzle.numbers[r]?.[c]
            const value = game.input[r]?.[c] ?? ''
            return (
              <button
                key={`${r}:${c}`}
                type="button"
                role="gridcell"
                tabIndex={-1}
                className={classes.join(' ')}
                aria-selected={isSelected}
                aria-label={`Linha ${r + 1}, coluna ${c + 1}${number ? `, número ${number}` : ''}, ${value || 'vazia'}`}
                onClick={() => onSelect(r, c)}
              >
                {number ? <span className="cell-number">{number}</span> : null}
                <span className="cell-value">{value}</span>
              </button>
            )
          }),
        )}
      </div>
      <input
        ref={inputRef}
        className="sr-input"
        type="text"
        value=""
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Digite as letras da palavra selecionada"
        onKeyDown={onKeyDown}
        onChange={onTextInput}
      />
    </div>
  )
}