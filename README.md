# Palavras Cruzadas Vault

Jogo de palavras cruzadas em português (pt-BR), 100% local: sem backend, sem Firebase, sem APIs externas.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — `tsc -b && vite build`
- `npm test` — Vitest
- `npm run lint` — oxlint
- `npm run typecheck` — `tsc -b --pretty false`
- `npm run preview` — pré-visualiza o build

## Arquitetura

- `src/engine` — TypeScript puro e determinístico (sem React/DOM): normalização, PRNG, numeração, gerador e validador.
- `src/data` — corpus curado (`CORPUS`, `CORPUS_VERSION`).
- `src/game` — estado de jogo imutável, navegação e persistência.
- `src/components`, `App.tsx`, `useCrosswordGame.ts` — UI React. O engine não depende da UI.

## Dificuldades

Fácil, Normal, Difícil e Especial usam grades de 9×9, 11×11, 13×13 e 15×15. A seleção inicia um novo jogo após confirmação quando há progresso; a dificuldade e o seed ficam salvos para continuar a mesma partida.

## Normalização

Respostas: NFD, remoção de marcas combinantes (ç → C), maiúsculas, apenas A–Z. Uma palavra é válida se tiver de 3 a 15 letras e nenhuma letra for descartada (sem dígitos, espaços ou hífens). O texto com acentos é preservado para exibição.

## Gerador

`generatePuzzle(seed, corpus, { size = 15, targetWords = 14 })`. Até 60 tentativas, cada uma com `mulberry32((seed + tentativa * 0x9e3779b1) >>> 0)`. Embaralha o corpus deduplicado, centraliza a primeira palavra na horizontal e encaixa as demais por cruzamento (até 3 passadas), escolhendo o melhor encaixe por número de cruzamentos. Recorta a grade, calcula sequências, numera e valida com `validatePuzzle`. A mesma seed sempre gera o mesmo jogo.

## Persistência

`localStorage` (`crosswordvault:game:v1`) guarda seed, dificuldade, `corpusVersion`, letras e reveladas. O jogo é regenerado a partir do seed e da dificuldade; se `corpusVersion` mudar ou o salvamento estiver corrompido, ele é descartado.

## Como adicionar palavras

Adicione `['palavra', 'dica original curta']` em `src/data/corpus.ts` e rode `npm test` (valida unicidade, formato e dicas). Altere `CORPUS_VERSION` ao modificar ou remover palavras existentes, pois jogos salvos dependem do corpus.

## Limites

- Corpus pequeno (~160 palavras); não há conjunto de 500 palavras.
- Sem estatísticas, contas, ranking ou sincronização.
- Um jogo salvo por vez.