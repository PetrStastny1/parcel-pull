import { deepStrictEqual, equal, strictEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { parseBoard } from '../../levels/boards.ts'
import { levels } from '../../levels/index.ts'
import { isWon, positionKey, pull, stars } from './game.ts'

test('a parcel advances one cell and takes a separate pull to deliver', () => {
  const board = parseBoard(1, ['.A.', '...'], ['W1A'])
  const magnet = board.magnets[0]
  const atDock = pull(board, board.initial, magnet)

  deepStrictEqual(atDock, { A: 0, B: -1, C: -1 })
  equal(isWon(atDock), false)
  deepStrictEqual(board.initial, { A: 1, B: -1, C: -1 })

  const delivered = pull(board, atDock, magnet)
  deepStrictEqual(delivered, { A: -1, B: -1, C: -1 })
  equal(isWon(delivered), true)
  strictEqual(pull(board, delivered, magnet), delivered)
})

test('adjacent parcels advance together into cells vacated during the same pull', () => {
  const board = parseBoard(1, ['.ABC', '....'], ['W1', 'S1A', 'S2B', 'S3C'])

  deepStrictEqual(pull(board, board.initial, board.magnets[3]), { A: 0, B: 1, C: 2 })
})

test('walls block movement in their segment and leave the other segments active', () => {
  const board = parseBoard(1, ['.A#B.', '....C'], ['W1', 'N1A', 'E1B', 'E2C'])

  deepStrictEqual(pull(board, board.initial, board.magnets[3]), { A: 0, B: 3, C: 9 })
})

test('an occupied dock edge blocks the wrong parcel and its adjacent parcels', () => {
  const board = parseBoard(1, ['BA.', '...'], ['W1A', 'S1B'])
  const positions = board.initial

  strictEqual(pull(board, positions, board.magnets[1]), positions)
})

test('delivery frees the edge cell and a completed dock still acts as a magnet', () => {
  const board = parseBoard(1, ['AB.C', '....'], ['W1A', 'S1B', 'S2C'])
  const dock = board.magnets[2]
  const afterDelivery = pull(board, board.initial, dock)
  const afterNextPull = pull(board, afterDelivery, dock)

  deepStrictEqual(afterDelivery, { A: -1, B: 0, C: 2 })
  deepStrictEqual(afterNextPull, { A: -1, B: 0, C: 1 })
  strictEqual(pull(board, afterNextPull, dock), afterNextPull)
})

test('the published blocked route is dead and the preceding state remains solvable', () => {
  const level = levels[2]
  const bothMoved = pull(level, level.initial, level.magnets[3])
  const blocked = pull(level, bothMoved, level.magnets[0])

  deepStrictEqual(bothMoved, { A: 8, B: 7, C: -1 })
  equal(level.winning.has(positionKey(bothMoved)), true)
  equal(level.winning.has(positionKey(blocked)), false)
  equal(isWon(blocked), false)
})

test('stars use the three documented thresholds', () => {
  const level = levels[0]
  deepStrictEqual([2, 3, 4, 5].map((moves) => stars(level, moves)), [3, 2, 2, 1])
})
