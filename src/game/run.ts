import { isWon, pull } from './logic/game.ts'
import type { Level, Magnet, Positions } from './logic/game.ts'

export type SavedRun = {
  level: number
  positions: Positions
  history: readonly Positions[]
  won: boolean
}

export function freshRun(level: Level): SavedRun {
  return { level: level.id, positions: level.initial, history: [], won: false }
}

export function moveRun(level: Level, run: SavedRun, magnet: Magnet): SavedRun {
  const positions = pull(level, run.positions, magnet)
  if (positions === run.positions) return run
  return { ...run, positions, history: [...run.history, run.positions], won: isWon(positions) }
}

export function undoRun(run: SavedRun): SavedRun {
  const positions = run.history.at(-1)
  if (!positions) return run
  return { ...run, positions, history: run.history.slice(0, -1), won: isWon(positions) }
}
