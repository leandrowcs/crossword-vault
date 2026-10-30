import { describe, expect, it } from 'vitest'
import { isValidAnswer, normalizeAnswer } from '../engine/normalize'
import { CORPUS, CORPUS_VERSION } from './corpus'

describe('corpus', () => {
  it('tem tamanho mínimo', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(12)
    expect(CORPUS_VERSION).toBeGreaterThanOrEqual(1)
  })

  it('tem respostas válidas e únicas', () => {
    const answers = CORPUS.map((entry) => normalizeAnswer(entry.word))
    expect(CORPUS.every((entry) => isValidAnswer(entry.word))).toBe(true)
    expect(new Set(answers).size).toBe(answers.length)
  })

  it('tem dicas não vazias que não revelam a resposta', () => {
    for (const entry of CORPUS) {
      expect(entry.clue.trim().length).toBeGreaterThan(0)
      const clueWords = entry.clue.split(/\s+/).map(normalizeAnswer)
      expect(clueWords).not.toContain(normalizeAnswer(entry.word))
    }
  })
})