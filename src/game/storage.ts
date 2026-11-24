import { parcels } from './logic/game.ts'
import type { Level, Positions } from './logic/game.ts'
import type { Language } from '../i18n/index.ts'

type Result = { moves: number; stars: number }
export type SavedRun = { level: number; positions: Positions; history: Positions[]; won: boolean }
export type Progress = {
  version: 1
  sound: boolean
  language?: Language
  results: Record<number, Result>
  run?: SavedRun
}

const key = 'parcel-pull.progress'
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function validPositions(value: unknown, level: Level): value is Positions {
  if (!record(value)) return false
  const occupied = new Set<number>()
  return parcels.every((parcel) => {
    const index = value[parcel]
    if (index === -1) return true
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 ||
      index >= level.width * level.height || level.walls.has(index) ||
      level.initial[parcel] === -1 || occupied.has(index)) return false
    occupied.add(index)
    return true
  })
}

export function unlockedLevel(progress: Progress, lastLevel: number) {
  let level = 1
  while (level < lastLevel && progress.results[level]) level++
  return level
}

export function readProgress(levels: readonly Level[]) {
  const empty: Progress = { version: 1, sound: true, results: {} }
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return { progress: empty, available: false }
  }
  if (raw === null) return { progress: empty, available: true }

  let saved: unknown
  try {
    saved = JSON.parse(raw)
  } catch {
    return { progress: empty, available: true }
  }
  if (!record(saved) || saved.version !== 1 || typeof saved.sound !== 'boolean' || !record(saved.results)) {
    return { progress: empty, available: true }
  }

  const progress: Progress = { ...empty, sound: saved.sound }
  if (saved.language === 'en' || saved.language === 'cs') progress.language = saved.language
  for (const level of levels) {
    const result = saved.results[level.id]
    if (!record(result) || typeof result.moves !== 'number' || !Number.isInteger(result.moves) ||
      result.moves < level.minimum || typeof result.stars !== 'number' || !Number.isInteger(result.stars) ||
      result.stars < 1 || result.stars > 3) break
    progress.results[level.id] = { moves: result.moves, stars: result.stars }
  }
  if (record(saved.run)) {
    const run = saved.run
    const level = levels.find((board) => board.id === run.level)
    if (level && level.id <= unlockedLevel(progress, levels.length) && validPositions(run.positions, level) &&
      typeof run.won === 'boolean' && Array.isArray(run.history) && run.history.every((state: unknown) => validPositions(state, level))) {
      progress.run = { level: level.id, positions: run.positions, history: run.history, won: run.won }
    }
  }
  return { progress, available: true }
}

export function writeProgress(progress: Progress) {
  try {
    localStorage.setItem(key, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}
