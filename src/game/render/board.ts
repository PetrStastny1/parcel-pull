import type { Level, Magnet, Parcel, Positions, Side } from '../logic/game.ts'
import type { MessageKey } from '../../i18n/index.ts'

export type Copy = (key: MessageKey, values?: Record<string, string | number>) => string
const parcels = ['A', 'B', 'C'] as const
const sides: Record<Side, MessageKey> = { N: 'north', E: 'east', S: 'south', W: 'west' }
const arrows: Record<Side, string> = { N: '↑', E: '→', S: '↓', W: '←' }
const directions: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }

function tile(column: number, row: number, className: string) {
  const element = document.createElement('div')
  element.className = className
  place(element, column, row)
  return element
}

function place(element: HTMLElement, column: number, row: number) {
  element.style.setProperty('--column', String(column))
  element.style.setProperty('--row', String(row))
}

function symbol(parcel: Parcel) {
  const shape = document.createElement('span')
  shape.className = 'parcel-symbol'
  shape.dataset.parcel = parcel
  shape.setAttribute('aria-hidden', 'true')
  return shape
}

function magnetPosition(magnet: Magnet, level: Level): [number, number] {
  const line = magnet.index + 1
  if (magnet.side === 'N') return [line, 0]
  if (magnet.side === 'E') return [level.width + 1, line]
  if (magnet.side === 'S') return [line, level.height + 1]
  return [0, line]
}

export function createBoard(level: Level, activate: (magnet: Magnet) => void) {
  const element = document.createElement('div')
  element.className = 'board'
  element.style.setProperty('--columns', String(level.width + 2))
  element.style.setProperty('--rows', String(level.height + 2))
  const bed = tile(1, 1, 'board-bed')
  bed.setAttribute('aria-hidden', 'true')
  element.append(bed)

  const cells = Array.from({ length: level.width * level.height }, (_, index) => {
    const cell = tile(index % level.width + 1, Math.floor(index / level.width) + 1, 'cell')
    if (level.walls.has(index)) cell.classList.add('wall')
    cell.setAttribute('aria-hidden', 'true')
    element.append(cell)
    return cell
  })

  const magnets = new Map<Magnet, HTMLButtonElement>()
  const clockwise = [...level.magnets].sort((first, second) => {
    const order = 'NESW'.indexOf(first.side) - 'NESW'.indexOf(second.side)
    return order || (first.side === 'S' || first.side === 'W' ? -1 : 1) * (first.index - second.index)
  })
  for (const magnet of clockwise) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'magnet'
    button.dataset.magnet = magnet.id
    button.dataset.side = magnet.side
    place(button, ...magnetPosition(magnet, level))
    const arrow = document.createElement('span')
    arrow.className = 'magnet-arrow'
    arrow.textContent = arrows[magnet.side]
    arrow.setAttribute('aria-hidden', 'true')
    button.append(arrow)
    if (magnet.parcel) {
      button.classList.add('dock')
      button.dataset.parcel = magnet.parcel
      button.append(symbol(magnet.parcel))
    }
    let touchEndedOutside = false
    button.addEventListener('pointerdown', () => { touchEndedOutside = false })
    button.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'touch') return
      const end = document.elementFromPoint(event.clientX, event.clientY)
      touchEndedOutside = !button.contains(end)
    })
    button.addEventListener('click', (event) => {
      if (!touchEndedOutside || event.detail === 0) activate(magnet)
      touchEndedOutside = false
    })
    element.append(button)
    magnets.set(magnet, button)
  }

  const boxes = Object.fromEntries(parcels.map((parcel) => {
    const box = tile(0, 0, 'parcel')
    box.dataset.parcel = parcel
    box.setAttribute('aria-hidden', 'true')
    box.append(symbol(parcel))
    element.append(box)
    return [parcel, box] as const
  })) as Record<Parcel, HTMLDivElement>

  const describe = (copy: Copy, positions: Positions) => {
    for (const [magnet, button] of magnets) {
      button.setAttribute('aria-label', copy(magnet.parcel ? 'dock' : 'magnet', {
        side: copy(sides[magnet.side]), index: magnet.index + 1, parcel: magnet.parcel ?? '',
      }))
      button.classList.toggle('fulfilled', Boolean(magnet.parcel && positions[magnet.parcel] < 0))
    }
    return parcels.filter((parcel) => positions[parcel] >= 0).map((parcel) => copy('parcelPosition', {
      parcel, column: positions[parcel] % level.width + 1, row: Math.floor(positions[parcel] / level.width) + 1,
    })).join(' ')
  }

  let revision = 0
  const show = (positions: Positions, previous?: Positions, magnet?: Magnet, duration = 0) => {
    const frame = ++revision
    for (const parcel of parcels) {
      const box = boxes[parcel]
      for (const animation of box.getAnimations()) animation.cancel()
      const next = positions[parcel]
      const old = previous?.[parcel] ?? next
      box.hidden = next < 0
      if (next < 0 && (old < 0 || !magnet || !duration)) continue
      const index = next < 0 ? old : next
      const column = index % level.width + 1
      const row = Math.floor(index / level.width) + 1
      place(box, column, row)
      if (!duration || next === old) continue
      if (next < 0 && magnet) {
        const [dx, dy] = directions[magnet.side]
        box.hidden = false
        const delivery = box.animate([
          { transform: 'translate(0, 0)', opacity: 1 },
          { transform: `translate(calc(var(--cell) * ${dx}), calc(var(--cell) * ${dy})) scale(.65)`, opacity: 0 },
        ], { duration, easing: 'ease-out', fill: 'forwards' })
        delivery.onfinish = () => {
          if (revision === frame) box.hidden = true
          delivery.cancel()
        }
      } else {
        const start = old < 0
          ? { transform: 'scale(.5)', opacity: 0 }
          : { transform: `translate(calc(var(--cell) * ${old % level.width + 1 - column}), calc(var(--cell) * ${Math.floor(old / level.width) + 1 - row}))` }
        box.animate([start, { transform: 'none', opacity: 1 }], { duration, easing: 'ease-out' })
      }
    }
  }

  const pulse = (magnet: Magnet, blocked: boolean, duration: number, mismatch: Parcel | undefined, staticPulse: boolean) => {
    const paint = blocked ? 'var(--blocked-pulse)' : 'var(--lane-pulse)'
    const easing = staticPulse ? 'steps(1, end)' : 'ease-out'
    for (const index of magnet.lane) {
      if (!level.walls.has(index)) {
        cells[index].animate([{ background: paint }, { background: 'var(--cell-bg)' }], { duration, easing })
      }
    }
    const outline = mismatch ? 'var(--warning)' : paint
    magnets.get(magnet)?.animate([{ outline: `3px solid ${outline}` }, { outline: '3px solid transparent' }], { duration, easing })
    if (mismatch) {
      boxes[mismatch].animate([{ outline: '3px solid var(--warning)' }, { outline: '3px solid transparent' }], { duration: 100, easing })
    }
  }

  const tutorial = (ids: readonly string[], lane: boolean, matchParcels = false) => {
    for (const cell of cells) cell.classList.remove('tutorial-cell')
    for (const [magnet, button] of magnets) {
      const highlighted = ids.includes(magnet.id)
      button.classList.toggle('tutorial-magnet', highlighted)
      if (highlighted && lane) {
        for (const index of magnet.lane) cells[index].classList.add('tutorial-cell')
      }
    }
    for (const parcel of parcels) boxes[parcel].classList.toggle('tutorial-parcel', matchParcels)
  }

  return { element, describe, show, pulse, tutorial, focus: () => magnets.values().next().value?.focus() }
}
