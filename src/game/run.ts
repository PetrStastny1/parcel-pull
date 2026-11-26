import { isWon, moveLimit, pull } from './logic/game.ts'
import type { Level, Magnet, Positions } from './logic/game.ts'

export const bonusMoves = 5

export type SavedRun = {
  level: number
  positions: Positions
  history: readonly Positions[]
  won: boolean
  bonus: boolean
  bonusRequested: boolean
}

export function freshRun(level: Level): SavedRun {
  return { level: level.id, positions: level.initial, history: [], won: false, bonus: false, bonusRequested: false }
}

export function movesLeft(level: Level, run: SavedRun): number {
  return moveLimit(level) + (run.bonus ? bonusMoves : 0) - run.history.length
}

export function isOutOfMoves(level: Level, run: SavedRun): boolean {
  return !run.won && movesLeft(level, run) <= 0
}

export function moveRun(level: Level, run: SavedRun, magnet: Magnet): SavedRun {
  if (isOutOfMoves(level, run)) return run
  const positions = pull(level, run.positions, magnet)
  if (positions === run.positions) return run
  return { ...run, positions, history: [...run.history, run.positions], won: isWon(positions) }
}

export function undoRun(run: SavedRun): SavedRun {
  const positions = run.history.at(-1)
  if (!positions) return run
  return { ...run, positions, history: run.history.slice(0, -1), won: isWon(positions) }
}

export function requestBonus(run: SavedRun): SavedRun {
  return { ...run, bonusRequested: true }
}

export function grantBonus(run: SavedRun): SavedRun {
  return { ...run, bonus: true }
}
