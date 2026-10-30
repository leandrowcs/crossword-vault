export const MIN_LENGTH = 2
export const MAX_LENGTH = 15

export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

export function isValidAnswer(input: string): boolean {
  const normalized = normalizeAnswer(input)
  if (normalized.length < MIN_LENGTH || normalized.length > MAX_LENGTH) return false
  const letters = Array.from(input.normalize('NFC')).length
  return normalized.length === letters
}