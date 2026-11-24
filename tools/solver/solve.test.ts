import { deepStrictEqual, equal, throws } from 'node:assert/strict'
import { test } from 'node:test'
import { boards, parseBoard } from '../../src/levels/boards.ts'
import { levels } from '../../src/levels/index.ts'
import distances from '../../src/levels/distances.json' with { type: 'json' }
import { solve } from './solve.ts'

const prototypeResults = [
  [2, 1], [3, 1], [6, 3], [7, 1], [8, 1], [9, 3],
  [11, 8], [10, 4], [11, 1], [12, 3], [14, 6], [15, 1],
]

test('all manifest entries match the prototype minima and exact shortest solution counts', () => {
  equal(boards.length, prototypeResults.length)
  for (const [index, board] of boards.entries()) {
    const result = solve(board)
    deepStrictEqual([result.minimum, result.shortestSolutions], prototypeResults[index], `Level ${board.id}`)
    equal(levels[index].minimum, result.minimum)
    deepStrictEqual(Object.fromEntries(result.winning), distances[index], `Level ${board.id} distances`)
  }
})

test('manifest validation rejects malformed dimensions, symbols, magnet indices and positions', () => {
  throws(() => parseBoard(1, ['.A.', '..'], ['W1A']), /grid/)
  throws(() => parseBoard(1, ['.A?', '...'], ['W1A']), /grid/)
  throws(() => parseBoard(1, ['.AA', '...'], ['W1A']), /duplicate parcel/)
  throws(() => parseBoard(1, ['...', '...'], ['W1A']), /missing parcel/)
  throws(() => parseBoard(1, ['.A.', '...'], ['W3A']), /magnet index/)
  throws(() => parseBoard(1, ['.A.', '...'], ['W1A', 'W1']), /duplicate magnet position/)
  throws(() => parseBoard(1, ['.A.', '...'], ['W1B']), /dock and parcel mismatch/)
})
