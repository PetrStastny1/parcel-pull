import assert from 'node:assert/strict'
import { test } from 'node:test'
import { legacyLevelIds, levels } from '../levels/index.ts'
import { moveLimit } from './logic/game.ts'
import { readProgress } from './storage.ts'

const saved = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => { saved.set(key, value) },
    removeItem: (key: string) => { saved.delete(key) },
  },
})

const level = levels[0]
const results = { 1: { moves: 2, stars: 3 } }

function load(used: number, flags: object = {}) {
  const positions = level.initial
  const run = { level: 1, positions, history: Array.from({ length: used }, () => positions), won: false, ...flags }
  saved.set('parcel-pull.progress', JSON.stringify({ version: 2, sound: true, hints: 0, results, run }))
  return readProgress(levels, legacyLevelIds).progress
}

test('keeps a run that used exactly its move limit, with or without the bonus', () => {
  assert.equal(load(moveLimit(level)).run?.history.length, moveLimit(level))
  assert.deepEqual(load(moveLimit(level)).run?.bonus, false)
  const extended = load(moveLimit(level) + 5, { bonus: true, bonusRequested: true }).run
  assert.equal(extended?.history.length, moveLimit(level) + 5)
  assert.equal(extended?.bonus, true)
})

test('drops a run longer than its limit but keeps completed results', () => {
  const progress = load(moveLimit(level) + 1)
  assert.equal(progress.run, undefined)
  assert.deepEqual(progress.results, results)
  assert.equal(load(moveLimit(level) + 6, { bonus: true, bonusRequested: true }).run, undefined)
})

test('rejects a bonus that was never requested', () => {
  assert.equal(load(1, { bonus: true }).run, undefined)
})
