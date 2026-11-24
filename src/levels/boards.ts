import { parcels } from '../game/logic/game.ts'
import type { Board, Magnet, Side } from '../game/logic/game.ts'
import manifest from './boards.json' with { type: 'json' }

const sides: readonly Side[] = ['N', 'E', 'S', 'W']

export function parseBoard(id: number, grid: readonly string[], docks: readonly string[]): Board {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const invalid = (reason: string) => new Error(`Invalid level ${id}: ${reason}`)

  if (height < 2 || height > 4 || width < 3 || width > 5 ||
      grid.some((row) => row.length !== width || !/^[.#ABC]+$/.test(row))) {
    throw invalid('grid')
  }
  if (docks.length < 1 || docks.length > 10) throw invalid('magnet count')

  const cells = grid.join('')
  const walls = new Set<number>()
  const initial = { A: -1, B: -1, C: -1 }

  for (const [cell, glyph] of [...cells].entries()) {
    if (glyph === '#') walls.add(cell)
    if (glyph === 'A' || glyph === 'B' || glyph === 'C') {
      if (initial[glyph] !== -1) throw invalid('duplicate parcel')
      initial[glyph] = cell
    }
  }
  if (parcels.every((parcel) => initial[parcel] === -1)) throw invalid('missing parcel')

  const slots = new Set<string>()
  const magnets = docks.map((dock): Magnet => {
    const match = /^([NESW])([1-5])([ABC])?$/.exec(dock)
    if (match === null) throw invalid('magnet code')

    const side = sides.find((candidate) => candidate === match[1])
    if (side === undefined) throw invalid('magnet side')

    const index = Number(match[2]) - 1
    const vertical = side === 'N' || side === 'S'
    if (index >= (vertical ? width : height)) throw invalid('magnet index')

    const slot = dock.slice(0, 2)
    if (slots.has(slot)) throw invalid('duplicate magnet position')
    slots.add(slot)

    const lane = Array.from({ length: vertical ? height : width }, (_, offset) => {
      switch (side) {
        case 'N': return offset * width + index
        case 'E': return index * width + width - 1 - offset
        case 'S': return (height - 1 - offset) * width + index
        case 'W': return index * width + offset
      }
    })
    const parcel = parcels.find((candidate) => candidate === match[3])
    return { id: dock, side, index, lane, ...(parcel === undefined ? {} : { parcel }) }
  })

  for (const parcel of parcels) {
    const count = magnets.filter((magnet) => magnet.parcel === parcel).length
    if (count !== Number(initial[parcel] !== -1)) throw invalid('dock and parcel mismatch')
  }

  magnets.sort((a, b) => sides.indexOf(a.side) - sides.indexOf(b.side) || a.index - b.index)
  return { id, width, height, walls, magnets, initial }
}

export const boards = manifest.map(({ grid, docks }, index) => parseBoard(index + 1, grid, docks))
