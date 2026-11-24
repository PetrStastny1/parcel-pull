import { isWon, parcels } from './logic/game.ts'
import type { Level, Positions } from './logic/game.ts'
import type { SavedRun } from './run.ts'
import type { Language } from '../i18n/index.ts'

type Result = { moves: number; stars: number }
export type ProgressChange = {
  run?: SavedRun
  result?: { level: number; moves: number; stars: number }
  spendHint?: boolean
}
export type Progress = {
  version: 2
  sound: boolean
  language?: Language
  hints: number
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

export function readProgress(levels: readonly Level[], legacyLevelIds: Readonly<Record<number, number>>) {
  const empty: Progress = { version: 2, sound: true, hints: 0, results: {} }
  let raw: string | null
  let soundPreference: boolean | undefined
  let languagePreference: Language | undefined
  try {
    raw = localStorage.getItem(key)
    const sound = localStorage.getItem(`${key}.sound`)
    const language = localStorage.getItem(`${key}.language`)
    if (sound === 'true' || sound === 'false') soundPreference = sound === 'true'
    if (language === 'en' || language === 'cs') languagePreference = language
  } catch {
    return { progress: empty, available: false }
  }
  if (soundPreference !== undefined) empty.sound = soundPreference
  if (languagePreference !== undefined) empty.language = languagePreference
  if (raw === null) return { progress: empty, available: true }

  let saved: unknown
  try {
    saved = JSON.parse(raw)
  } catch {
    return { progress: empty, available: true }
  }

  if (!record(saved) || (saved.version !== 1 && saved.version !== 2) ||
      typeof saved.sound !== 'boolean' || !record(saved.results)) {
    return { progress: empty, available: true }
  }

  const migrated = saved.version === 1
  const currentId = (id: number) => {
    if (!migrated || id <= 12) return id
    return legacyLevelIds[id]
  }
  const progress: Progress = { ...empty, sound: soundPreference ?? saved.sound }
  if (languagePreference === undefined && (saved.language === 'en' || saved.language === 'cs')) {
    progress.language = saved.language
  }
  for (const [storedId, result] of Object.entries(saved.results)) {
    const id = Number(storedId)
    const level = String(id) === storedId ? levels[currentId(id) - 1] : undefined
    if (level && record(result) && typeof result.moves === 'number' && Number.isSafeInteger(result.moves) &&
        result.moves >= level.minimum && typeof result.stars === 'number' && Number.isInteger(result.stars) &&
        result.stars >= 1 && result.stars <= 3) {
      progress.results[level.id] = { moves: result.moves, stars: result.stars }
    }
  }

  if (migrated) {
    progress.hints = Math.min(3, Math.floor(Object.keys(progress.results).length / 3))
  } else if (typeof saved.hints === 'number' && Number.isInteger(saved.hints) && saved.hints >= 0 && saved.hints <= 3) {
    progress.hints = saved.hints
  }

  if (record(saved.run)) {
    const run = saved.run
    const level = typeof run.level === 'number' ? levels[currentId(run.level) - 1] : undefined
    if (level && (level.id <= unlockedLevel(progress, levels.length) || Object.values(legacyLevelIds).includes(level.id)) &&
      validPositions(run.positions, level) && run.won === isWon(run.positions) &&
      Array.isArray(run.history) && run.history.every((state: unknown) => validPositions(state, level))) {
      progress.run = { level: level.id, positions: run.positions, history: run.history, won: run.won }
    }
  }
  return { progress, available: true, migrated }
}

export function canWriteProgress() {
  try {
    let probe = `${key}.write-test`
    while (localStorage.getItem(probe) !== null) probe += '.'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function writePreference<Name extends 'sound' | 'language'>(name: Name, value: NonNullable<Progress[Name]>) {
  try {
    localStorage.setItem(`${key}.${name}`, String(value))
    return true
  } catch {
    return false
  }
}

export function applyProgressChange(previous: Progress, { result, spendHint, ...change }: ProgressChange) {
  const progress = { ...previous, ...change }
  const spent = Boolean(spendHint && progress.hints > 0)
  if (spent) progress.hints--
  const firstCompletion = result !== undefined && !progress.results[result.level]
  if (result) {
    const best = progress.results[result.level]
    progress.results = {
      ...progress.results,
      [result.level]: {
        moves: Math.min(result.moves, best?.moves ?? result.moves),
        stars: Math.max(result.stars, best?.stars ?? result.stars),
      },
    }
    if (firstCompletion && Object.keys(progress.results).length % 3 === 0) progress.hints = Math.min(3, progress.hints + 1)
  }
  return { progress, spent, firstCompletion }
}

export async function writeProgress(
  levels: readonly Level[],
  legacyLevelIds: Readonly<Record<number, number>>,
  fallback: Progress,
  change: ProgressChange,
) {
  const write = () => {
    const latest = readProgress(levels, legacyLevelIds)
    const updated = applyProgressChange(latest.available ? latest.progress : fallback, change)
    if (!latest.available) return { ...updated, available: false }
    try {
      localStorage.setItem(key, JSON.stringify(updated.progress))
      return { ...updated, available: true }
    } catch {
      return { ...updated, available: false }
    }
  }
  if (!navigator.locks) return write()
  try {
    return await navigator.locks.request(key, write)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'SecurityError') return write()
    throw error
  }
}
