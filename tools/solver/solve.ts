import { isWon, positionKey, pull } from '../../src/game/logic/game.ts'
import type { Board, Positions } from '../../src/game/logic/game.ts'

type Visit = {
  key: string
  positions: Positions
  steps: number
  paths: number
  predecessors: Visit[]
}

export function solve(board: Board) {
  const start: Visit = {
    key: positionKey(board.initial),
    positions: board.initial,
    steps: 0,
    paths: 1,
    predecessors: [],
  }
  const visits = new Map([[start.key, start]])
  const queue = [start]
  let goal: Visit | undefined

  for (const current of queue) {
    if (isWon(current.positions)) goal = current
    for (const magnet of board.magnets) {
      const positions = pull(board, current.positions, magnet)
      if (positions === current.positions) continue

      const key = positionKey(positions)
      const steps = current.steps + 1
      const known = visits.get(key)
      if (known !== undefined) {
        if (known.steps === steps) known.paths += current.paths
        known.predecessors.push(current)
      } else {
        const visit = { key, positions, steps, paths: current.paths, predecessors: [current] }
        visits.set(key, visit)
        queue.push(visit)
      }
    }
  }

  if (goal === undefined) throw new Error(`Level ${board.id} has no solution`)

  const winning = new Map([[goal.key, 0]])
  for (const [key, distance] of winning) {
    const visit = visits.get(key)
    if (visit === undefined) throw new Error(`Unknown state ${key}`)
    for (const predecessor of visit.predecessors) {
      if (!winning.has(predecessor.key)) winning.set(predecessor.key, distance + 1)
    }
  }

  return { minimum: goal.steps, shortestSolutions: goal.paths, winning }
}
