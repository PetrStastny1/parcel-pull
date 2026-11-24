import { isWon, positionIndex, pull } from '../../src/game/logic/game.ts'
import type { Board, Magnet, Positions } from '../../src/game/logic/game.ts'

type Visit = {
  key: number
  positions: Positions
  steps: number
  paths: number
  firstMove?: { from: Visit; magnet: Magnet }
  predecessors?: Visit[]
}

function search(board: Board, allStates: boolean, maximum = Infinity) {
  const start: Visit = {
    key: positionIndex(board.initial),
    positions: board.initial,
    steps: 0,
    paths: 1,
    predecessors: allStates ? [] : undefined,
  }
  const visits = new Map([[start.key, start]])
  const queue = [start]
  let goal: Visit | undefined

  for (const current of queue) {
    if (isWon(current.positions)) {
      goal = current
      if (!allStates) break
    }
    if (current.steps >= maximum) continue
    for (const magnet of board.magnets) {
      const positions = pull(board, current.positions, magnet)
      if (positions === current.positions) continue

      const key = positionIndex(positions)
      const steps = current.steps + 1
      const known = visits.get(key)
      if (known !== undefined) {
        if (known.steps === steps) known.paths += current.paths
        known.predecessors?.push(current)
      } else {
        const visit: Visit = { key, positions, steps, paths: current.paths }
        if (allStates) visit.predecessors = [current]
        else visit.firstMove = { from: current, magnet }
        visits.set(key, visit)
        queue.push(visit)
      }
    }
  }

  return { goal, visits }
}

export function shortestRoute(board: Board, maximum?: number) {
  const { goal } = search(board, false, maximum)
  if (!goal) return undefined

  const moves = []
  for (let visit = goal; visit.firstMove; visit = visit.firstMove.from) {
    moves.push({ magnet: visit.firstMove.magnet, before: visit.firstMove.from.positions, after: visit.positions })
  }
  return { minimum: goal.steps, shortestSolutions: goal.paths, moves: moves.reverse() }
}

export function solve(board: Board) {
  const { goal, visits } = search(board, true)
  if (goal === undefined) throw new Error(`Level ${board.id} has no solution`)

  const winning = new Map([[goal.key, 0]])
  for (const [key, distance] of winning) {
    const visit = visits.get(key)
    if (visit === undefined) throw new Error(`Unknown state ${key}`)
    for (const predecessor of visit.predecessors ?? []) {
      if (!winning.has(predecessor.key)) winning.set(predecessor.key, distance + 1)
    }
  }

  return {
    minimum: goal.steps,
    shortestSolutions: goal.paths,
    winning: new Map(Array.from(winning, ([key, distance]) => [key.toString(36), distance])),
  }
}
