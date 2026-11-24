import { parcels, pull } from '../../src/game/logic/game.ts'
import { parseBoard } from '../../src/levels/boards.ts'
import { shortestRoute } from './solve.ts'

type Layout = { grid: string[]; docks: string[] }
type Profile = { seed: number; minimum: number; maximum: number; maxSolutions: number }
type Candidate = Layout & {
  attempt: number
  minimum: number
  shortestSolutions: number
  route: string[]
}

const profiles: readonly Profile[] = [
  { seed: 172721, minimum: 12, maximum: 16, maxSolutions: 16 },
  { seed: 172722, minimum: 14, maximum: 19, maxSolutions: 24 },
  { seed: 172723, minimum: 17, maximum: 24, maxSolutions: 32 },
]

function random(seed: number) {
  let state = seed
  return (size: number) => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) % size
  }
}

function shuffle<Value>(values: Value[], draw: ReturnType<typeof random>) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = draw(index + 1)
    const value = values[index]
    values[index] = values[other]
    values[other] = value
  }
}

function drawLayout(draw: ReturnType<typeof random>, firstPhase: boolean): Layout {
  const width = firstPhase ? 4 + draw(2) : 5
  const height = 4
  const magnetCount = 6 + draw(4)
  const wallCount = 1 + draw(firstPhase ? 2 : 3)
  const slots = ['N', 'E', 'S', 'W'].flatMap((side, index) =>
    Array.from({ length: index % 2 === 0 ? width : height }, (_, offset) => side + (offset + 1)),
  )
  const indexes = Array.from({ length: width * height }, (_, index) => index)
  shuffle(slots, draw)
  shuffle(indexes, draw)

  const cells = Array<string>(width * height).fill('.')
  for (const [index, parcel] of parcels.entries()) cells[indexes[index]] = parcel
  for (const index of indexes.slice(3, 3 + wallCount)) cells[index] = '#'
  return {
    grid: Array.from({ length: height }, (_, row) => cells.slice(row * width, (row + 1) * width).join('')),
    docks: slots.slice(0, magnetCount).map((slot, index) => slot + (parcels[index] ?? '')),
  }
}

function rotateClockwise(matrix: readonly string[]) {
  return Array.from({ length: matrix[0].length }, (_, column) =>
    matrix.map((row) => row[column]).reverse().join(''),
  )
}

function normalized(matrix: readonly string[]) {
  const symbols = new Map<string, string>()
  const cells = matrix.join('/').replace(/[abcABC]/g, (glyph) => {
    const parcel = glyph.toUpperCase()
    if (!symbols.has(parcel)) symbols.set(parcel, parcels[symbols.size])
    const renamed = symbols.get(parcel)!
    return glyph === parcel ? renamed : renamed.toLowerCase()
  })
  return cells
}

export function layoutKey({ grid, docks }: Layout) {
  const width = grid[0].length
  const height = grid.length
  const ring = [
    Array<string>(width + 2).fill('.'),
    ...grid.map((row) => [...`.${row}.`]),
    Array<string>(width + 2).fill('.'),
  ]
  // Keeping the docks in the outer ring applies the same transform to them and the board.
  for (const dock of docks) {
    const index = Number(dock[1])
    const glyph = dock[2]?.toLowerCase() ?? 'm'
    switch (dock[0]) {
      case 'N': ring[0][index] = glyph; break
      case 'E': ring[index][width + 1] = glyph; break
      case 'S': ring[height + 1][index] = glyph; break
      case 'W': ring[index][0] = glyph; break
    }
  }

  const orientations = []
  let matrix = ring.map((row) => row.join(''))
  for (let angle = 0; angle < 4; angle++) {
    orientations.push(normalized(matrix), normalized(matrix.map((row) => [...row].reverse().join(''))))
    matrix = rotateClockwise(matrix)
  }
  return orientations.sort()[0]
}

function qualifyLayout(layout: Layout, profile: Profile, attempt: number): Candidate | undefined {
  const board = parseBoard(attempt, layout.grid, layout.docks)
  const effective = board.magnets.filter((magnet) => pull(board, board.initial, magnet) !== board.initial)
  if (effective.length < 2) return undefined

  const route = shortestRoute(board, profile.maximum)
  if (!route || route.minimum < profile.minimum || route.shortestSolutions > profile.maxSolutions) return undefined
  if (!route.moves.some(({ before, after }) =>
    parcels.filter((parcel) => after[parcel] >= 0 && after[parcel] !== before[parcel]).length >= 2,
  )) return undefined

  const withoutWalls = shortestRoute({ ...board, walls: new Set() }, route.minimum)
  if (withoutWalls?.minimum === route.minimum && withoutWalls.shortestSolutions === route.shortestSolutions) return undefined

  return {
    ...layout, attempt, minimum: route.minimum, shortestSolutions: route.shortestSolutions,
    route: route.moves.map(({ magnet }) => magnet.id),
  }
}

function generatePhase(profile: Profile, phase: number, seen: Set<string>, extend = false) {
  const draw = random(profile.seed)
  const accepted: Candidate[] = []
  let attempt = 0
  let qualifying = 0
  let maximums = 0

  function search(limit: number, candidateLimit: number) {
    while (attempt < limit && accepted.length < candidateLimit && (!extend || maximums < 3)) {
      attempt++
      const layout = drawLayout(draw, phase === 0)
      const candidate = qualifyLayout(layout, profile, attempt)
      if (!candidate) continue

      const key = layoutKey(layout)
      if (seen.has(key)) continue
      seen.add(key)
      accepted.push(candidate)
      if (candidate.minimum >= 20) qualifying++
      if (candidate.minimum === 24) maximums++
    }
  }

  search(50_000, 100)
  const originalQualifying = qualifying
  if (extend && phase === profiles.length - 1 && qualifying < 3) {
    search(250_000, Infinity)
    if (qualifying < 3) search(1_000_000, Infinity)
  }
  return { seed: profile.seed, attempts: attempt, originalQualifying, qualifying, accepted }
}

const legacyAttempts = [
  { previousId: 13, attempt: 28_061 },
  { previousId: 15, attempt: 51_188 },
  { previousId: 14, attempt: 234_011 },
]

export function campaignCandidates(base: readonly Layout[]) {
  const seen = new Set(base.map(layoutKey))
  const phases = profiles.map((profile, index) => generatePhase(profile, index, seen))
  const finalProfile = profiles[profiles.length - 1]
  const draw = random(finalProfile.seed)
  let attempt = 0
  const legacy = legacyAttempts.map(({ previousId, attempt: target }) => {
    // Replay the historical draw without solving candidates beyond the standard phase budget.
    while (++attempt < target) drawLayout(draw, false)
    const layout = drawLayout(draw, false)
    const candidate = qualifyLayout(layout, finalProfile, attempt)
    if (!candidate) throw new Error(`Legacy level ${previousId} fails the final phase filters`)
    const recorded = phases[phases.length - 1].accepted.find((entry) => entry.attempt === attempt)
    if (!recorded && seen.has(layoutKey(layout))) throw new Error(`Legacy level ${previousId} is a duplicate`)
    seen.add(layoutKey(layout))
    return { ...candidate, previousId }
  })
  return { phases, legacy }
}

export function selectHardLevels(base: readonly Layout[]) {
  const seen = new Set(base.map(layoutKey))
  const phases = profiles.map((profile, index) => generatePhase(profile, index, seen, true))
  const hardest = phases[phases.length - 1].accepted
    .filter(({ minimum }) => minimum >= 20)
    .sort((first, second) => second.minimum - first.minimum || first.attempt - second.attempt)
    .slice(0, 3)
  if (hardest.length < 3) throw new Error('The generator found fewer than three levels requiring at least 20 moves')
  return {
    phases: phases.map(({ seed, attempts, originalQualifying, qualifying, accepted }) => ({
      seed, attempts, originalQualifying, qualifying, accepted: accepted.length,
    })),
    hardest,
  }
}
