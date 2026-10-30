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
- `src/game` — estado de jogo imutável, navegação, persistência e histórico local.
- `src/components`, `App.tsx`, `useCrosswordGame.ts` — UI React. O engine não depende da UI.

## Experiência

O início apresenta a retomada da partida salva, a seleção da dificuldade para uma nova partida e estatísticas locais. As últimas 100 partidas ficam no `localStorage`; não há contas, ranking ou sincronização.

## Dificuldades

Fácil, Normal, Difícil e Especial usam grades de 9×9, 11×11, 13×13 e 15×15. A seleção de uma nova partida pede confirmação quando há progresso; dificuldade, seed, respostas, letras reveladas e horário inicial ficam salvos para retomar a partida.

## Normalização

Respostas: NFD, remoção de marcas combinantes (ç → C), maiúsculas, apenas A–Z. Uma palavra é válida se tiver de 3 a 15 letras e nenhuma letra for descartada (sem dígitos, espaços ou hífens). O texto com acentos é preservado para exibição.

## Gerador

`generatePuzzle(seed, corpus, { size = 15, targetWords })`. O alvo padrão é `max(14, round(size² × 0,2))`. São feitas até 40 tentativas determinísticas; cada uma usa `mulberry32((seed + tentativa * 0x9e3779b1) >>> 0)`. O corpus deduplicado é embaralhado, a primeira palavra fica centralizada na horizontal e as demais são encaixadas por cruzamento (até 6 passadas), priorizando o maior número de cruzamentos. A grade é recortada, numerada e validada com `validatePuzzle`. A mesma seed sempre gera o mesmo jogo.

## Persistência

`localStorage` guarda a partida (`crosswordvault:game:v1`) e até 100 registros (`crosswordvault:history:v1`). O jogo é regenerado a partir do seed e da dificuldade; salvamentos inválidos não são restaurados. O histórico inclui inícios, conclusões, uso de ajuda e recorde de duração.

## Como adicionar palavras

Adicione `['palavra', 'dica original curta']` em `src/data/corpus.ts` e rode `npm test` (valida unicidade, formato e dicas). Altere `CORPUS_VERSION` ao modificar ou remover palavras existentes, pois jogos salvos dependem do corpus.

## Limites

- Um jogo salvo por vez; iniciar outro mantém o histórico, mas substitui a partida retomável.
- Histórico e estatísticas existem apenas neste navegador e podem ser apagados ao limpar os dados locais.
- Não há contas, ranking, sincronização ou testes em navegador real; a interface tem testes de integração com jsdom.