import assert from 'node:assert/strict'
import { test } from 'node:test'
import { levels } from '../levels/index.ts'
import { freshRun, grantBonus, isOutOfMoves, moveRun, movesLeft, requestBonus, undoRun } from './run.ts'

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

test('stops at the move limit, returns a move on undo and extends the attempt once with the bonus', () => {
  const level = levels[0]
  const dock = level.magnets.find(({ id }) => id === 'W1A')!
  const away = { ...dock, id: 'test-east', parcel: undefined, lane: [2, 1, 0] }
  let run = freshRun(level)
  assert.equal(movesLeft(level, run), 6)

  for (let turn = 0; turn < 6; turn++) run = moveRun(level, run, turn % 2 ? dock : away)
  assert.equal(run.history.length, 6)
  assert.equal(movesLeft(level, run), 0)
  assert.equal(isOutOfMoves(level, run), true)
  assert.equal(moveRun(level, run, away), run)

  const undone = undoRun(run)
  assert.equal(movesLeft(level, undone), 1)
  assert.equal(isOutOfMoves(level, undone), false)

  const requested = requestBonus(run)
  assert.equal(requested.bonusRequested, true)
  assert.equal(movesLeft(level, requested), 0)
  const extended = grantBonus(requested)
  assert.equal(movesLeft(level, extended), 5)
  assert.equal(movesLeft(level, undoRun(extended)), 6)
  assert.equal(undoRun(extended).bonus, true)
  assert.deepEqual([freshRun(level).bonus, freshRun(level).bonusRequested], [false, false])
  assert.equal(movesLeft(level, { ...run, history: [...run.history, ...run.history] }), 0)
})

test('a winning move on the last allowed turn is a win, not an exhausted attempt', () => {
  const level = levels[0]
  const dock = level.magnets[0]
  const away = { ...dock, id: 'test-east', parcel: undefined, lane: [2, 1, 0] }
  let run = freshRun(level)
  for (let turn = 0; turn < 4; turn++) run = moveRun(level, run, turn % 2 ? dock : away)
  assert.deepEqual(run.positions, level.initial)
  run = moveRun(level, moveRun(level, run, dock), dock)
  assert.equal(run.won, true)
  assert.equal(movesLeft(level, run), 0)
  assert.equal(isOutOfMoves(level, run), false)
})
