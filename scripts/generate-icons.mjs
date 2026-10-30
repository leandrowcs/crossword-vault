import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const dir = resolve(import.meta.dirname, '..', 'public', 'icons')

const targets = [
  { source: 'crossword-vault-logo.svg', output: 'crossword-vault-logo-192.png', size: 192 },
  { source: 'crossword-vault-logo.svg', output: 'crossword-vault-logo-512.png', size: 512 },
  { source: 'crossword-vault-maskable.svg', output: 'apple-touch-icon.png', size: 180 },
  { source: 'crossword-vault-maskable.svg', output: 'crossword-vault-maskable-192.png', size: 192 },
  { source: 'crossword-vault-maskable.svg', output: 'crossword-vault-maskable-512.png', size: 512 },
]

for (const { source, output, size } of targets) {
  const svg = await readFile(resolve(dir, source))
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
  await writeFile(resolve(dir, output), png)
  console.log(`${output} ${size}x${size}`)
}
