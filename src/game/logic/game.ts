export const parcels = ['A', 'B', 'C'] as const
export type Parcel = (typeof parcels)[number]
export type Side = 'N' | 'E' | 'S' | 'W'
export type Positions = Readonly<Record<Parcel, number>>

export type Magnet = {
  id: string
  side: Side
  index: number
  parcel?: Parcel
  lane: readonly number[]
}

export type Board = {
  id: number
  width: number
  height: number
  walls: ReadonlySet<number>
  magnets: readonly Magnet[]
  initial: Positions
}

export type Level = Board & {
  minimum: number
  winning: ReadonlySet<string>
}

export function positionKey({ A, B, C }: Positions): string {
  // Each slot represents absence or one of at most twenty cells.
  return (((A + 1) * 21 + B + 1) * 21 + C + 1).toString(36)
}

export function isWon({ A, B, C }: Positions): boolean {
  return A === -1 && B === -1 && C === -1
}

export function pull(board: Board, positions: Positions, magnet: Magnet): Positions {
  const next = { ...positions }
  let moved = false

  for (const [offset, cell] of magnet.lane.entries()) {
    const parcel = parcels.find((symbol) => next[symbol] === cell)
    if (parcel === undefined) continue

    if (offset === 0) {
      if (magnet.parcel !== parcel) continue
      next[parcel] = -1
    } else {
      const target = magnet.lane[offset - 1]
      if (board.walls.has(target) || parcels.some((symbol) => next[symbol] === target)) continue
      next[parcel] = target
    }
    moved = true
  }

  return moved ? next : positions
}

export function stars(level: Level, moves: number): number {
  if (moves <= level.minimum) return 3
  if (moves <= level.minimum + 2) return 2
  return 1
}
