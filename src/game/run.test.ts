import assert from 'node:assert/strict'
import { test } from 'node:test'
import { levels } from '../levels/index.ts'
import { freshRun, moveRun, undoRun } from './run.ts'

test('counts a simultaneous move as one turn and an ineffective move as none', () => {
  const level = levels[2]
  const initial = freshRun(level)
  const northDock = level.magnets.find(({ id }) => id === 'N3A')!
  const eastDock = level.magnets.find(({ id }) => id === 'E3B')!

  assert.equal(moveRun(level, initial, northDock), initial)
  const next = moveRun(level, initial, eastDock)
  assert.deepEqual(next.positions, { A: 8, B: 7, C: -1 })
  assert.deepEqual(next.history, [initial.positions])
  assert.deepEqual(undoRun(next), initial)
  assert.equal(undoRun(initial), initial)
})

test('recognizes delivery as a win, undoes it and clears prior turns on restart', () => {
  const level = levels[0]
  const [dock] = level.magnets
  const initial = freshRun(level)
  const moved = moveRun(level, initial, dock)
  const won = moveRun(level, moved, dock)

  assert.equal(moved.won, false)
  assert.equal(won.won, true)
  assert.equal(won.history.length, 2)
  assert.deepEqual(undoRun(won), moved)
  assert.deepEqual(freshRun(level), initial)
})
