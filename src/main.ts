import { GameAudio } from './game/audio.ts'
import { isWon, parcels, positionKey, pull, stars } from './game/logic/game.ts'
import type { Magnet, Positions } from './game/logic/game.ts'
import { createBoard } from './game/render/board.ts'
import type { Copy } from './game/render/board.ts'
import { readProgress, unlockedLevel, writeProgress } from './game/storage.ts'
import { browserLanguage, translate } from './i18n/index.ts'
import type { MessageKey } from './i18n/index.ts'
import { levels } from './levels/index.ts'
import { actionButton, dialogContent, labeledControl, languageSelect, starRating } from './ui/dialog.ts'
import './styles/tokens.css'
import './styles/game.css'

type Screen = 'menu' | 'game' | 'pause' | 'settings' | 'levels' | 'blocked' | 'won'
const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('Missing game mount')

const loaded = readProgress(levels)
const progress = loaded.progress
let storageAvailable = loaded.available
let language = progress.language ?? browserLanguage(navigator.languages, navigator.language)
const copy: Copy = (key, values) => translate(language, key, values)
const audio = new GameAudio()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const maximum = levels.length
let run = progress.run ?? freshRun(1)
let level = levels[run.level - 1]
let screen: Screen = 'menu'
let returnTo: 'menu' | 'pause' = 'menu'
let dialogReturnFocus: HTMLElement | undefined
let animationTimer: number | undefined
let pendingScreen: 'won' | 'blocked' | undefined
let tutorialTimer: number | undefined
let tutorialClear: number | undefined

const game = document.createElement('section')
game.className = 'game'
game.innerHTML = `<header class="game-header"><div class="brand"></div><div class="level-label"></div></header>
  <div class="stage"></div>
  <div class="controls">
    <p class="objective"></p>
    <div class="moves"></div>
    <div class="remaining"></div>
    <div class="game-actions"></div>
    <div class="sr-only" role="status" aria-atomic="true"></div>
  </div>`
const stage = game.querySelector<HTMLElement>('.stage')!
const brand = game.querySelector<HTMLElement>('.brand')!
const levelLabel = game.querySelector<HTMLElement>('.level-label')!
const objective = game.querySelector<HTMLElement>('.objective')!
const moves = game.querySelector<HTMLElement>('.moves')!
const remaining = game.querySelector<HTMLElement>('.remaining')!
const actions = game.querySelector<HTMLElement>('.game-actions')!
const status = game.querySelector<HTMLElement>('[role="status"]')!
const dialog = document.createElement('dialog')
dialog.className = 'game-dialog'
dialog.setAttribute('aria-labelledby', 'dialog-title')
const undoButton = actionButton(copy('undo'), undo)
const restartButton = actionButton(copy('restart'), restart)
const pauseButton = actionButton(copy('pause'), () => pause())
actions.append(undoButton, restartButton, pauseButton)
app.append(game, dialog)
let board = createBoard(level, activate)
stage.append(board.element)

function freshRun(id: number) {
  return { level: id, positions: levels[id - 1].initial, history: [] as Positions[], won: false }
}

function save() {
  storageAvailable = writeProgress(progress)
}

function updateCopy() {
  document.documentElement.lang = language
  document.title = copy('title')
  brand.textContent = copy('title')
  levelLabel.textContent = copy('level', { count: level.id })
  objective.textContent = copy('objective')
  undoButton.textContent = copy('undo')
  restartButton.textContent = copy('restart')
  pauseButton.textContent = copy('pause')
}

function refreshBoard(previous?: Positions, magnet?: Magnet, duration?: number, announcement = '') {
  const count = parcels.filter((parcel) => run.positions[parcel] >= 0).length
  moves.textContent = copy('moves', { count: run.history.length })
  remaining.textContent = copy('remaining', { count })
  undoButton.disabled = run.history.length === 0
  board.show(run.positions, previous, magnet, duration)
  const positions = board.describe(copy, run.positions)
  status.textContent = [announcement, remaining.textContent, positions].filter(Boolean).join(' ')
}

function cancelTutorial() {
  window.clearTimeout(tutorialTimer)
  window.clearTimeout(tutorialClear)
  board.tutorial([], false)
}

function tutorial(initial: boolean) {
  cancelTutorial()
  const show = (ids: string[], lane: boolean, duration: number, match = false) => {
    board.tutorial(ids, lane, match)
    if (duration) tutorialClear = window.setTimeout(() => board.tutorial([], false), duration)
  }
  const short = reducedMotion.matches ? 120 : 0
  if (level.id === 1) show(['W1A'], true, short)
  if (level.id === 2) {
    if (run.history.length === 0 && initial) {
      tutorialTimer = window.setTimeout(() => show(['W1'], false, short || 600), 1500)
    } else if (run.history.length === 1) {
      show(['S1A'], false, short || 600)
    }
  }
  if (level.id === 3 && run.history.length === 0 && initial) show(['N3A', 'E3B'], false, short || 600, true)
}

function renderDialog(focus = true) {
  if (screen === 'game') {
    if (dialog.open) dialog.close()
    return
  }
  const screenTitle: Record<Exclude<Screen, 'game'>, MessageKey> = {
    menu: 'title', pause: 'pause', settings: 'settings', levels: 'levels', blocked: 'routeBlocked',
    won: level.id === maximum ? 'gameWon' : 'levelWon',
  }
  const { details, actions: buttons } = dialogContent(dialog, copy, screenTitle[screen], { count: level.id })
  const add = (key: MessageKey, handler: () => void, primary = false) => {
    const button = actionButton(copy(key), handler, primary)
    button.dataset.action = key
    buttons.append(button)
    return button
  }

  if (screen === 'menu') {
    if (!storageAvailable) {
      const notice = document.createElement('p')
      notice.setAttribute('role', 'status')
      notice.textContent = copy('progressUnavailable')
      details.append(notice)
    }
    const hasProgress = progress.run || Object.keys(progress.results).length > 0
    add(hasProgress ? 'continue' : 'play', continueGame, true)
    if (hasProgress) add('levels', () => openLevels('menu'))
    add('settings', () => openSettings('menu'))
  }

  if (screen === 'pause') {
    add('resume', resume, true)
    add('levels', () => openLevels('pause'))
    add('settings', () => openSettings('pause'))
  }

  if (screen === 'settings') {
    const sound = document.createElement('input')
    sound.type = 'checkbox'
    sound.checked = progress.sound
    sound.addEventListener('change', () => {
      progress.sound = sound.checked
      audio.unlock()
      audio.update(progress.sound, !document.hidden)
      save()
    })
    const select = languageSelect(language, copy, (selected) => {
      language = selected
      progress.language = selected
      save()
      updateCopy()
      refreshBoard()
      renderDialog(false)
      dialog.querySelector('select')?.focus()
    })
    details.append(labeledControl(copy('language'), select), labeledControl(copy('sound'), sound))
    add('back', back)
  }

  if (screen === 'levels') {
    const grid = document.createElement('div')
    grid.className = 'level-grid'
    const unlocked = unlockedLevel(progress, maximum)
    for (const candidate of levels) {
      const earned = progress.results[candidate.id]?.stars ?? 0
      const button = actionButton(String(candidate.id), () => enter(candidate.id))
      button.disabled = candidate.id > unlocked
      button.dataset.level = String(candidate.id)
      button.setAttribute('aria-label', copy(button.disabled ? 'lockedLevel' : 'levelEntry', { count: candidate.id, stars: earned }))
      const score = starRating(earned, 3, copy('stars', { count: earned }))
      score.setAttribute('aria-hidden', 'true')
      button.append(score)
      grid.append(button)
    }
    details.append(grid)
    add('back', back)
  }

  if (screen === 'blocked') {
    add('undo', undo, true)
    add('restart', restart)
    add('levels', () => openLevels('menu'))
  }

  if (screen === 'won') {
    const final = level.id === maximum
    const earned = final
      ? Object.values(progress.results).reduce((sum, result) => sum + result.stars, 0)
      : stars(level, run.history.length)
    details.append(starRating(earned, final ? maximum * 3 : 3, copy('stars', { count: earned })))
    const result = document.createElement('p')
    result.textContent = copy('moves', { count: run.history.length })
    details.append(result)
    if (!final) add('next', () => enter(level.id + 1, true), true)
    add('replay', () => enter(level.id, true), final)
    add('levels', () => openLevels('menu'))
  }

  if (!dialog.open) dialog.showModal()
  if (focus) dialog.querySelector<HTMLButtonElement>('.primary, .level-grid button:enabled, .dialog-actions button')?.focus()
}

function openLevels(from: 'menu' | 'pause') {
  returnTo = from
  screen = 'levels'
  renderDialog()
}

function openSettings(from: 'menu' | 'pause') {
  returnTo = from
  screen = 'settings'
  renderDialog()
}

function back() {
  const action = screen
  screen = returnTo
  renderDialog(false)
  dialog.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.focus()
}

function resume() {
  screen = 'game'
  renderDialog()
  tutorial(true)
  if (dialogReturnFocus?.isConnected && !dialogReturnFocus.matches(':disabled')) {
    dialogReturnFocus.focus()
  } else {
    board.focus()
  }
}

function pause(fromVisibility = false) {
  if (screen !== 'game') return
  if (animationTimer !== undefined && !fromVisibility) return
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
  cancelTutorial()
  screen = 'pause'
  renderDialog()
}

function enter(id: number, reset = false) {
  audio.unlock()
  cancelTutorial()
  level = levels[id - 1]
  run = !reset && progress.run?.level === id && !progress.run.won ? progress.run : freshRun(id)
  progress.run = run
  save()
  board = createBoard(level, activate)
  stage.replaceChildren(board.element)
  updateCopy()
  refreshBoard()
  screen = level.winning.has(positionKey(run.positions)) ? 'game' : 'blocked'
  renderDialog()
  if (screen === 'game') {
    tutorial(true)
    board.focus()
  }
}

function continueGame() {
  if (progress.run && !progress.run.won) {
    enter(progress.run.level)
    return
  }
  const first = levels.find((candidate) => !progress.results[candidate.id])
  if (first) enter(first.id)
  else openLevels('menu')
}

function finishAnimation(playWin = true) {
  window.clearTimeout(animationTimer)
  animationTimer = undefined
  if (!pendingScreen) return
  const result = pendingScreen
  pendingScreen = undefined
  screen = result
  if (result === 'won' && playWin) audio.play('win')
  renderDialog()
}

function lock(duration: number) {
  if (duration === 0) finishAnimation()
  else animationTimer = window.setTimeout(finishAnimation, duration)
}

function activate(magnet: Magnet) {
  if (screen !== 'game' || animationTimer !== undefined || document.hidden) return
  audio.unlock()
  const previous = run.positions
  const target = magnet.parcel
  const mismatch = target ? parcels.find((parcel) => parcel !== target && previous[parcel] === magnet.lane[0]) : undefined
  const positions = pull(level, previous, magnet)
  const blocked = previous === positions
  const movementTime = reducedMotion.matches ? 0 : blocked ? 100 : 160
  board.pulse(magnet, blocked, movementTime || 120, mismatch, reducedMotion.matches)
  if (blocked) {
    audio.play('blocked')
    refreshBoard(undefined, undefined, undefined, copy('noMove'))
    lock(movementTime)
    return
  }
  if (level.id === 2 && run.history.length === 0) cancelTutorial()
  const delivered = parcels.filter((parcel) => positions[parcel] < 0 && previous[parcel] >= 0).length
  const moved = parcels.filter((parcel) => positions[parcel] >= 0 && positions[parcel] !== previous[parcel]).length
  run.history.push(previous)
  run.positions = positions
  run.won = isWon(positions)
  if (run.won) {
    const count = run.history.length
    const earned = stars(level, count)
    const best = progress.results[level.id]
    progress.results[level.id] = { moves: Math.min(count, best?.moves ?? count), stars: Math.max(earned, best?.stars ?? earned) }
    pendingScreen = 'won'
    cancelTutorial()
  } else if (!level.winning.has(positionKey(positions))) {
    pendingScreen = 'blocked'
    cancelTutorial()
  } else if (level.id === 1 || level.id === 2) {
    tutorial(false)
  } else {
    cancelTutorial()
  }
  save()
  audio.play(delivered ? 'delivery' : 'move')
  const announcement = [moved ? copy('moved', { count: moved }) : '', delivered ? copy('delivered', { count: delivered }) : '']
    .filter(Boolean).join(' ')
  refreshBoard(previous, magnet, movementTime, announcement)
  lock(movementTime)
}

function restore(positions: Positions, animate: boolean) {
  const previous = run.positions
  run.positions = positions
  run.won = false
  save()
  if (screen === 'blocked') {
    dialogReturnFocus = undefined
    resume()
  }
  const duration = animate && !reducedMotion.matches ? 120 : 0
  refreshBoard(previous, undefined, duration, copy('restored'))
  tutorial(true)
  lock(duration)
}

function undo() {
  if ((screen !== 'game' && screen !== 'blocked') || animationTimer !== undefined || document.hidden) return
  const previous = run.history.pop()
  if (!previous) return
  audio.unlock()
  audio.play('undo')
  restore(previous, true)
}

function restart() {
  if ((screen !== 'game' && screen !== 'blocked') || animationTimer !== undefined || document.hidden) return
  run.history = []
  restore(level.initial, false)
}

function escape() {
  if (screen === 'game') pause()
  else if (screen === 'pause' && !document.hidden) resume()
  else if (screen === 'settings' || screen === 'levels') back()
}

dialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  escape()
})

game.addEventListener('keydown', (event) => {
  if (screen !== 'game' || event.ctrlKey || event.metaKey || event.altKey) return
  const key = event.key.toLowerCase()
  if (event.repeat) {
    if (key === 'enter' || key === ' ' || key === 'escape' || key === 'z' || key === 'r') event.preventDefault()
    return
  }
  if (key === 'escape' || key === 'z' || key === 'r') {
    event.preventDefault()
    if (key === 'escape') escape()
    if (key === 'z') undo()
    if (key === 'r') restart()
  }
})

document.addEventListener('visibilitychange', () => {
  audio.update(progress.sound, !document.hidden)
  if (!document.hidden || screen !== 'game') return
  if (animationTimer !== undefined) {
    refreshBoard()
    finishAnimation(false)
  }
  if (screen === 'game') pause(true)
})

audio.update(progress.sound, !document.hidden)
updateCopy()
refreshBoard()
renderDialog()
