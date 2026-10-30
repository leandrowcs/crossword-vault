// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('fluxo principal', () => {
  it('inicia jogo, navega por teclado e registra o histórico', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Jogar' })).toBeTruthy()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dificuldade da nova partida' }), '9')
    await user.click(screen.getByRole('button', { name: 'Começar jogo' }))

    const board = await screen.findByRole('grid', { name: 'Grade de palavras cruzadas' })
    await waitFor(() => expect(document.activeElement).toBe(board))
    const initialCell = board.getAttribute('aria-activedescendant')
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(board.getAttribute('aria-activedescendant')).not.toBe(initialCell))
    await user.keyboard('{Tab}')
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('tab'))

    await user.click(screen.getByRole('button', { name: 'Início' }))
    expect(await screen.findByText('Fácil · Não concluída')).toBeTruthy()
    expect(screen.getByText('Iniciadas').nextElementSibling?.textContent).toBe('1')
  })

  it('retoma a partida salva após remontar a aplicação', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App />)

    expect(await screen.findByRole('heading', { name: 'Jogar' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Começar jogo' }))
    expect(await screen.findByRole('grid', { name: 'Grade de palavras cruzadas' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Início' }))
    firstRender.unmount()

    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Continuar partida' }))

    expect(await screen.findByRole('grid', { name: 'Grade de palavras cruzadas' })).toBeTruthy()
  })
})
