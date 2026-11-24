import { deepStrictEqual, equal, ok, throws } from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parcels, pull } from '../../src/game/logic/game.ts'
import { boards, parseBoard } from '../../src/levels/boards.ts'
import { legacyLevelIds, levels } from '../../src/levels/index.ts'
import manifest from '../../src/levels/boards.json' with { type: 'json' }
import distances from '../../src/levels/distances.json' with { type: 'json' }
import { layoutKey } from './candidates.ts'
import { shortestRoute, solve } from './solve.ts'

const prototypeResults = [
  [2, 1], [3, 1], [6, 3], [7, 1], [8, 1], [9, 3],
  [11, 8], [10, 4], [11, 1], [12, 3], [14, 6], [15, 1],
]

const legacyBoards = [
  { previousId: 13, currentId: 40, grid: ['...C.', '.#...', 'A..#.', 'B...#'], docks: ['S1A', 'E1B', 'N1C', 'N5', 'S4', 'W3', 'S5', 'W1'], result: [22, 4] },
  { previousId: 14, currentId: 39, grid: ['.A..#', '.....', '.#...', 'B...C'], docks: ['S1A', 'E4B', 'N1C', 'W1', 'E1', 'W4', 'N5'], result: [22, 20] },
  { previousId: 15, currentId: 38, grid: ['..AC.', '..#..', '.....', '.B...'], docks: ['N2A', 'S3B', 'W4C', 'S5', 'N4', 'E1'], result: [21, 29] },
]

const phaseLimits = [
  { through: 2, parcels: 1, walls: [0, 0], moves: [2, 3], maxSolutions: 1 },
  { through: 5, parcels: 2, walls: [0, 0], moves: [6, 8], maxSolutions: 5 },
  { through: 9, parcels: 2, walls: [1, 2], moves: [9, 11], maxSolutions: 8 },
  { through: 16, parcels: 3, walls: [1, 2], moves: [12, 16], maxSolutions: 16 },
  { through: 28, parcels: 3, walls: [1, 3], moves: [14, 19], maxSolutions: 24 },
  { through: 40, parcels: 3, walls: [1, 3], moves: [17, 24], maxSolutions: 32 },
]

test('preserves the twelve brief layouts and the exact three relocated prototype layouts', () => {
  const brief = readFileSync(new URL('../../docs/game/BRIEF.md', import.meta.url), 'utf8')
  const definition = brief.match(/### Prvních 12 úrovní\s+```json\r?\n([\s\S]+?)\r?\n```/)
  ok(definition)
  deepStrictEqual(manifest.slice(0, 12), JSON.parse(definition[1]))

  equal(Object.keys(legacyLevelIds).length, legacyBoards.length)
  for (const { previousId, currentId, grid, docks } of legacyBoards) {
    equal(legacyLevelIds[previousId], currentId)
    deepStrictEqual(manifest[currentId - 1], { grid, docks })
    equal(shortestRoute(boards[currentId - 1], 19), undefined)
  }
})

test('all forty boards are unique, satisfy their phase limits, and match the runtime distance tables', () => {
  equal(boards.length, 40)
  equal(levels.length, 40)
  equal(distances.length, 40)
  equal(new Set(manifest.map(layoutKey)).size, 40)

  let previousMinimum = 0
  for (const [index, board] of boards.entries()) {
    const phase = phaseLimits.find(({ through }) => board.id <= through)
    ok(phase)
    const { minimum, shortestSolutions, winning } = solve(board)
    const [minMoves, maxMoves] = phase.moves
    const [minWalls, maxWalls] = phase.walls
    ok(minimum >= minMoves && minimum <= maxMoves, `Level ${board.id} minimum`)
    if (board.id > 12) ok(minimum >= previousMinimum, `Level ${board.id} difficulty order`)
    previousMinimum = minimum
    ok(shortestSolutions >= 1 && shortestSolutions <= phase.maxSolutions, `Level ${board.id} shortest solutions`)
    ok(board.walls.size >= minWalls && board.walls.size <= maxWalls, `Level ${board.id} walls`)
    equal(parcels.filter((parcel) => board.initial[parcel] >= 0).length, phase.parcels, `Level ${board.id} parcels`)
    equal(levels[index].minimum, minimum)
    deepStrictEqual(Object.fromEntries(winning), distances[index], `Level ${board.id} distances`)

    const reference = prototypeResults[index] ?? legacyBoards.find(({ currentId }) => currentId === board.id)?.result
    if (reference) deepStrictEqual([minimum, shortestSolutions], reference, `Level ${board.id} prototype result`)
  }
})

test('all generated boards satisfy the movement and wall filters', () => {
  for (const board of boards.slice(12)) {
    const label = `Level ${board.id}`
    equal(board.height, 4, `${label} height`)
    ok(board.width === 5 || (board.id <= 16 && board.width === 4), `${label} width`)
    ok(board.magnets.length >= 6 && board.magnets.length <= 9, `${label} magnet count`)
    const effective = board.magnets.filter((magnet) => pull(board, board.initial, magnet) !== board.initial)
    ok(effective.length >= 2, `${label} effective initial magnets`)

    const route = shortestRoute(board)
    ok(route, `${label} solvability`)
    ok(route.moves.some(({ before, after }) =>
      parcels.filter((parcel) => after[parcel] >= 0 && after[parcel] !== before[parcel]).length >= 2,
    ), `${label} simultaneous movement on the first shortest route`)

    const withoutWalls = shortestRoute({ ...board, walls: new Set() })
    ok(withoutWalls?.minimum !== route.minimum || withoutWalls.shortestSolutions !== route.shortestSolutions,
      `${label} wall influence`)
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
