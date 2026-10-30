interface ToolbarProps {
  onCheck: () => void
  onRevealLetter: () => void
  onRevealWord: () => void
  onRevealAll: () => void
  onNewGame: () => void
}

export function Toolbar({ onCheck, onRevealLetter, onRevealWord, onRevealAll, onNewGame }: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Ajudas e ações">
      <button type="button" className="btn" onClick={onCheck}>
        Verificar
      </button>
      <button type="button" className="btn" onClick={onRevealLetter}>
        Revelar letra
      </button>
      <button type="button" className="btn" onClick={onRevealWord}>
        Revelar palavra
      </button>
      <button type="button" className="btn btn-danger" onClick={onRevealAll}>
        Revelar tudo
      </button>
      <button type="button" className="btn btn-primary" onClick={onNewGame}>
        Novo jogo
      </button>
    </div>
  )
}