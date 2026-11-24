import { positionKey } from '../game/logic/game.ts'
import type { Level } from '../game/logic/game.ts'
import { boards } from './boards.ts'
import distances from './distances.json' with { type: 'json' }

export const levels: readonly Level[] = boards.map((board, index) => {
  const entries: Readonly<Partial<Record<string, number>>> = distances[index]
  const minimum = entries[positionKey(board.initial)]
  if (minimum === undefined) throw new Error(`Missing distance for level ${board.id}`)
  return { ...board, minimum, winning: new Set(Object.keys(entries)) }
})
