import { GameAudio } from './game/audio.ts'
import { parcels, positionKey, pull, stars } from './game/logic/game.ts'
import type { Magnet, Positions } from './game/logic/game.ts'
import { createBoard } from './game/render/board.ts'
import type { Copy } from './game/render/board.ts'
import { freshRun, moveRun, undoRun } from './game/run.ts'
import type { SavedRun } from './game/run.ts'
import { applyProgressChange, canWriteProgress, readProgress, unlockedLevel, writePreference, writeProgress } from './game/storage.ts'
import type { ProgressChange } from './game/storage.ts'
import { browserLanguage, translate } from './i18n/index.ts'
import type { MessageKey } from './i18n/index.ts'
import { legacyLevelIds, levels } from './levels/index.ts'
import { createPlatform } from './platform/index.ts'
import type { AdKind, AdOutcome, Platform } from './platform/contract.ts'
import { actionButton, dialogContent, labeledControl, languageSelect, starRating } from './ui/dialog.ts'
import './styles/tokens.css'
import './styles/game.css'

type Screen = 'loading' | 'menu' | 'game' | 'pause' | 'settings' | 'levels' | 'statistics' | 'blocked' | 'won' | 'hint' | 'ad'
type LevelPickerSource = Extract<Screen, 'menu' | 'pause' | 'blocked' | 'won'>

const dialogDismissals: Partial<Record<Screen, () => void>> = {
  pause: resume,
  settings: back,
  levels: back,
  statistics: back,
  won: openMenu,
}

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('Missing game mount')

const loaded = readProgress(levels, legacyLevelIds)
const progress = loaded.progress
let storageAvailable = loaded.available && canWriteProgress()
let language = progress.language ?? browserLanguage(navigator.languages, navigator.language)
const copy: Copy = (key, values) => translate(language, key, values)
const audio = new GameAudio()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const maximum = levels.length
let run = progress.run ?? freshRun(levels[0])
let level = levels[run.level - 1]
let screen: Screen = 'loading'
let returnTo: LevelPickerSource = 'menu'
let dialogReturnFocus: HTMLElement | undefined
let animationTimer: number | undefined
let pendingScreen: 'won' | 'blocked' | undefined
let tutorialTimer: number | undefined
let tutorialClear: number | undefined
let platform: Platform
let platformMuted = false
let updatingRun = false
let skipMoveAnimation = false
let levelEntered = false
let levelAnnounced = false
let activeSince: number | undefined
let activeDuration = 0
let campaignJustCompleted = false
const usedHints = new Set<number>()
const requestedVideos = new Set<number>()
let videoUnavailable = false
let claimingHint = false
let hintMagnet: Magnet | undefined
let hintRemaining = 0
let hintSince: number | undefined
let hintTimer: number | undefined

const game = document.createElement('section')
game.className = 'game'
game.hidden = true
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
const hintButton = actionButton(copy('hint'), openHint)
hintButton.classList.add('game-hint')
actions.append(undoButton, restartButton, hintButton, pauseButton)
app.append(game, dialog)
let board = createBoard(level, activate)
stage.append(board.element)

async function save(change: ProgressChange) {
  if (change.run) progress.run = change.run
  const updated = storageAvailable
    ? await writeProgress(levels, legacyLevelIds, progress, change)
    : { ...applyProgressChange(progress, change), available: false }
  storageAvailable = updated.available
  progress.results = updated.progress.results
  progress.hints = updated.progress.hints
  updateHintButton()
  return updated
}

function updateAudio() {
  audio.update(progress.sound && !platformMuted, !document.hidden && screen !== 'ad')
}

function eventContext() {
  return { level: level.id, moves: run.history.length }
}

function stopGameplay() {
  if (activeSince === undefined) return
  activeDuration += performance.now() - activeSince
  activeSince = undefined
  suspendHint()
  platform.gameplayStop()
}

function startGameplay() {
  if (activeSince !== undefined || document.hidden || screen !== 'game') return
  activeSince = performance.now()
  levelEntered = true
  platform.gameplayStart()
  if (!levelAnnounced) {
    platform.record({ type: 'level_start', ...eventContext() })
    levelAnnounced = true
  }
  showHint()
}

function exitLevel() {
  stopGameplay()
  if (levelEntered && levelAnnounced && !run.won) platform.record({ type: 'level_exit', ...eventContext() })
  levelEntered = false
  levelAnnounced = false
}

function reportCompletion() {
  platform.recordCompletion?.(100 * Object.keys(progress.results).length / maximum)
}

function canUseFreeHint() {
  return level.id >= 4 && !usedHints.has(level.id) && progress.hints > 0
}

function canWatchVideo() {
  return level.id >= 6 && !usedHints.has(level.id) && !requestedVideos.has(level.id) &&
    platform.supportsAd('rewarded')
}

function updateHintButton() {
  hintButton.hidden = level.id < 4 || screen === 'loading'
  hintButton.disabled = hintButton.hidden || (!canUseFreeHint() && !canWatchVideo())
}

function clearHint() {
  window.clearTimeout(hintTimer)
  hintTimer = undefined
  hintSince = undefined
  hintRemaining = 0
  hintMagnet = undefined
  board.highlightHint()
}

function suspendHint() {
  if (hintSince === undefined) return
  window.clearTimeout(hintTimer)
  hintTimer = undefined
  hintRemaining -= performance.now() - hintSince
  hintSince = undefined
  board.highlightHint()
}

function showHint() {
  if (!hintMagnet) return
  if (hintRemaining <= 0) {
    clearHint()
    return
  }
  hintSince = performance.now()
  const magnet = board.highlightHint(hintMagnet, copy('hintedMagnet'))
  if (magnet) status.textContent = copy('hintSuggestion', { magnet })
  hintTimer = window.setTimeout(clearHint, hintRemaining)
}

function findHint() {
  const distance = level.distances[positionKey(run.positions)]
  if (distance === undefined || distance === 0) return undefined

  return level.magnets.find((magnet) => {
    const next = pull(level, run.positions, magnet)
    return level.distances[positionKey(next)] === distance - 1
  })
}

function openHint() {
  if (screen !== 'game' || updatingRun || animationTimer !== undefined || document.hidden ||
      (!canUseFreeHint() && !canWatchVideo())) return
  dialogReturnFocus = hintButton
  stopGameplay()
  cancelTutorial()
  videoUnavailable = false
  screen = 'hint'
  renderDialog()
}

function rewardHint(magnet: Magnet, source: 'free' | 'rewarded') {
  usedHints.add(level.id)
  hintMagnet = magnet
  hintRemaining = 3000
  platform.record({ type: 'hint_use', source, ...eventContext() })
  updateHintButton()
  if (document.hidden) {
    screen = 'pause'
    updateAudio()
    renderDialog()
  } else {
    resume()
  }
}

async function useFreeHint() {
  if (screen !== 'hint' || claimingHint || document.hidden || !canUseFreeHint()) return
  const magnet = findHint()
  if (!magnet) return
  claimingHint = true
  const { spent } = await save({ spendHint: true })
  claimingHint = false
  if (spent) rewardHint(magnet, 'free')
  else renderDialog()
}

async function watchVideo() {
  if (screen !== 'hint' || claimingHint || document.hidden || !canWatchVideo()) return
  const magnet = findHint()
  if (!magnet) return
  requestedVideos.add(level.id)
  const outcome = await playAd('rewarded')
  if (outcome === 'completed') {
    rewardHint(magnet, 'rewarded')
  } else {
    videoUnavailable = true
    screen = 'hint'
    updateAudio()
    updateHintButton()
    renderDialog()
  }
}

async function playAd(placement: AdKind) {
  screen = 'ad'
  updateAudio()
  renderDialog()
  platform.record({ type: 'ad_request', placement, ...eventContext() })
  let outcome: AdOutcome
  try {
    outcome = await platform.requestAd(placement)
  } catch {
    outcome = 'error'
  }
  platform.record({ type: 'ad_outcome', placement, outcome, ...eventContext() })
  return outcome
}

async function nextLevel() {
  if (screen !== 'won' || document.hidden) return
  const next = level.id + 1
  if (platform.supportsAd('interstitial')) await playAd('interstitial')
  await enter(next, true)
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
  hintButton.textContent = copy('hint')
}

function refreshBoard(previous?: Positions, magnet?: Magnet, duration?: number, announcement = '') {
  const count = parcels.filter((parcel) => run.positions[parcel] >= 0).length
  moves.textContent = copy('moves', { count: run.history.length })
  remaining.textContent = copy('remaining', { count })
  undoButton.disabled = run.history.length === 0
  updateHintButton()
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
  const results = Object.values(progress.results)
  const earnedStars = results.reduce((sum, result) => sum + result.stars, 0)
  const final = results.length === maximum && (level.id === maximum || campaignJustCompleted)
  const screenTitle: Record<Exclude<Screen, 'game'>, MessageKey> = {
    loading: 'title', menu: 'title', pause: 'pause', settings: 'settings', statistics: 'statistics',
    levels: 'levels', blocked: 'routeBlocked', won: final ? 'gameWon' : 'levelWon',
    hint: 'hint', ad: 'adWaiting',
  }
  dialog.dataset.screen = screen
  const dismissible = dialogDismissals[screen] !== undefined
  const { details, actions: buttons } = dialogContent(
    dialog, copy, screenTitle[screen], { count: level.id }, dismissible ? dismissDialog : undefined,
  )
  const add = (key: MessageKey, handler: () => void, primary = false) => {
    const button = actionButton(copy(key), () => {
      if (!updatingRun && !claimingHint) handler()
    }, primary)
    button.dataset.action = key
    buttons.append(button)
    return button
  }

  if (screen === 'loading') {
    const notice = document.createElement('p')
    notice.setAttribute('role', 'status')
    notice.textContent = copy('loading')
    details.append(notice)
  }

  if (screen === 'hint') {
    if (videoUnavailable) {
      const notice = document.createElement('p')
      notice.setAttribute('role', 'alert')
      notice.textContent = copy('videoUnavailable')
      details.append(notice)
    }
    if (canUseFreeHint()) {
      const stock = document.createElement('p')
      stock.textContent = copy('hintStock', { count: progress.hints })
      details.append(stock)
      add('useHint', useFreeHint, true)
    }
    if (canWatchVideo()) {
      const video = add('watchAd', watchVideo)
      const icon = document.createElement('span')
      icon.setAttribute('aria-hidden', 'true')
      icon.className = 'video-icon'
      video.prepend(icon)
    }
    add('resume', resume)
  }

  if (screen === 'menu') {
    if (!storageAvailable) {
      const notice = document.createElement('p')
      notice.setAttribute('role', 'status')
      notice.textContent = copy('progressUnavailable')
      details.append(notice)
    }
    const hasProgress = progress.run || results.length > 0
    add(hasProgress ? 'continue' : 'play', continueGame, true)
    if (hasProgress) add('levels', () => openLevels('menu'))
    add('settings', () => openSettings('menu'))
    add('statistics', () => {
      returnTo = 'menu'
      screen = 'statistics'
      renderDialog()
    })
  }

  if (screen === 'statistics') {
    const completed = document.createElement('p')
    completed.textContent = copy('completedLevels', { count: results.length, maximum })
    const stars = document.createElement('p')
    stars.textContent = copy('earnedStars', { count: earnedStars, maximum: maximum * 3 })
    details.append(completed, stars)
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
      updateAudio()
      if (storageAvailable) storageAvailable = writePreference('sound', progress.sound)
    })
    const select = languageSelect(language, copy, (selected) => {
      language = selected
      progress.language = selected
      if (storageAvailable) storageAvailable = writePreference('language', language)
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
      button.disabled = candidate.id > unlocked && !progress.results[candidate.id]
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
    add('levels', () => openLevels('blocked'))
  }

  if (screen === 'won') {
    const earned = final ? earnedStars : stars(level, run.history.length)
    details.append(starRating(earned, final ? maximum * 3 : 3, copy('stars', { count: earned })))
    const result = document.createElement('p')
    result.textContent = copy('moves', { count: run.history.length })
    details.append(result)
    const hasNext = !final && level.id < unlockedLevel(progress, maximum)
    if (hasNext) add('next', nextLevel, true)
    add('replay', () => enter(level.id, true), !hasNext)
    add('levels', () => openLevels('won'))
  }

  if (dismissible) add('menu', openMenu)

  if (!dialog.open) dialog.showModal()
  if (focus) {
    const action = dialog.querySelector<HTMLElement>('.primary') ??
      dialog.querySelector<HTMLElement>('.level-grid button:enabled, .dialog-actions button')
    const target = action ?? dialog.querySelector('h1')
    if (target && !action) target.tabIndex = -1
    target?.focus()
  }
}

function openMenu() {
  exitLevel()
  screen = 'menu'
  renderDialog()
}

function openLevels(from: LevelPickerSource) {
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
  if (document.hidden || claimingHint || (screen !== 'pause' && screen !== 'blocked' &&
      screen !== 'hint' && screen !== 'ad')) return
  screen = 'game'
  updateAudio()
  renderDialog()
  tutorial(true)
  startGameplay()
  if (dialogReturnFocus?.isConnected && !dialogReturnFocus.matches(':disabled')) {
    dialogReturnFocus.focus()
  } else {
    board.focus()
  }
}

function pause(fromVisibility = false) {
  if (screen !== 'game') return
  if ((animationTimer !== undefined || updatingRun) && !fromVisibility) return
  stopGameplay()
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
  cancelTutorial()
  screen = 'pause'
  renderDialog()
}

async function enter(id: number, reset = false) {
  if (updatingRun) return
  updatingRun = true
  audio.unlock()
  if (screen !== 'ad') exitLevel()
  cancelTutorial()
  clearHint()
  dialogReturnFocus = undefined
  level = levels[id - 1]
  run = !reset && progress.run?.level === id && !progress.run.won ? progress.run : freshRun(level)
  const saved = save({ run })
  board = createBoard(level, activate)
  stage.replaceChildren(board.element)
  updateCopy()
  refreshBoard()
  await saved
  levelEntered = true
  levelAnnounced = false
  activeDuration = 0
  campaignJustCompleted = false
  updatingRun = false
  if (!level.winning.has(positionKey(run.positions))) screen = 'blocked'
  else screen = document.hidden ? 'pause' : 'game'
  updateAudio()
  renderDialog()
  if (screen === 'game') {
    tutorial(true)
    startGameplay()
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
  if (!pendingScreen || updatingRun) return
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

async function activate(magnet: Magnet) {
  if (screen !== 'game' || updatingRun || animationTimer !== undefined || document.hidden) return
  audio.unlock()
  const previous = run.positions
  const target = magnet.parcel
  const mismatch = target ? parcels.find((parcel) => parcel !== target && previous[parcel] === magnet.lane[0]) : undefined
  const movedRun = moveRun(level, run, magnet)
  const positions = movedRun.positions
  const blocked = movedRun === run
  const movementTime = reducedMotion.matches ? 0 : blocked ? 100 : 160
  if (blocked) {
    board.pulse(magnet, true, movementTime || 120, mismatch, reducedMotion.matches)
    audio.play('blocked')
    refreshBoard(undefined, undefined, undefined, copy('noMove'))
    lock(movementTime)
    return
  }
  updatingRun = true
  skipMoveAnimation = false
  clearHint()
  if (level.id === 2 && run.history.length === 0) cancelTutorial()
  const delivered = parcels.filter((parcel) => positions[parcel] < 0 && previous[parcel] >= 0).length
  const moved = parcels.filter((parcel) => positions[parcel] >= 0 && positions[parcel] !== previous[parcel]).length
  run = movedRun
  const result = run.won ? { level: level.id, moves: run.history.length, stars: stars(level, run.history.length) } : undefined
  if (result) {
    pendingScreen = 'won'
    stopGameplay()
    cancelTutorial()
  } else if (!level.winning.has(positionKey(positions))) {
    pendingScreen = 'blocked'
    stopGameplay()
    cancelTutorial()
  }
  const { firstCompletion } = await save({ run, result })
  updatingRun = false

  if (result) {
    campaignJustCompleted = firstCompletion && Object.keys(progress.results).length === maximum
    platform.record({ type: 'level_win', durationMs: Math.round(activeDuration), ...eventContext() })
    if (firstCompletion) reportCompletion()
  } else if (pendingScreen === 'blocked') {
    platform.record({ type: 'level_blocked', ...eventContext() })
  } else if (screen === 'game') {
    if (level.id === 1 || level.id === 2) tutorial(false)
    else cancelTutorial()
  }

  const animate = screen === 'game' && !document.hidden && !skipMoveAnimation
  if (animate) {
    board.pulse(magnet, false, movementTime || 120, mismatch, reducedMotion.matches)
    audio.play(delivered ? 'delivery' : 'move')
  }
  const announcement = [moved ? copy('moved', { count: moved }) : '', delivered ? copy('delivered', { count: delivered }) : '']
    .filter(Boolean).join(' ')
  refreshBoard(previous, magnet, animate ? movementTime : 0, announcement)
  if (animate) lock(movementTime)
  else finishAnimation(false)
}

async function restore(restoredRun: SavedRun, animate: boolean) {
  updatingRun = true
  clearHint()
  const previous = run.positions
  run = restoredRun
  await save({ run })
  updatingRun = false
  if (screen === 'blocked') {
    dialogReturnFocus = undefined
    if (document.hidden) {
      screen = 'pause'
      renderDialog()
    } else {
      resume()
    }
  }
  const duration = screen === 'game' && animate && !reducedMotion.matches ? 120 : 0
  refreshBoard(previous, undefined, duration, copy('restored'))
  if (screen === 'game') tutorial(true)
  lock(duration)
}

function undo() {
  if ((screen !== 'game' && screen !== 'blocked') || updatingRun || animationTimer !== undefined || document.hidden) return
  const restoredRun = undoRun(run)
  if (restoredRun === run) return
  audio.unlock()
  audio.play('undo')
  void restore(restoredRun, true)
}

function restart() {
  if ((screen !== 'game' && screen !== 'blocked') || updatingRun || animationTimer !== undefined || document.hidden) return
  activeDuration = 0
  if (activeSince !== undefined) activeSince = performance.now()
  void restore(freshRun(level), false)
}

function dismissDialog() {
  if (!updatingRun && !claimingHint) dialogDismissals[screen]?.()
}

function escape() {
  if (updatingRun || claimingHint) return
  if (screen === 'game') pause()
  else if (screen === 'hint') resume()
  else dismissDialog()
}

function isBackdrop(event: MouseEvent) {
  if (event.target !== dialog) return false
  const bounds = dialog.getBoundingClientRect()
  return event.clientX < bounds.left || event.clientX >= bounds.right ||
    event.clientY < bounds.top || event.clientY >= bounds.bottom
}

let pressedBackdrop = false
dialog.addEventListener('pointerdown', (event) => {
  pressedBackdrop = isBackdrop(event)
})
dialog.addEventListener('pointercancel', () => {
  pressedBackdrop = false
})
dialog.addEventListener('click', (event) => {
  if (pressedBackdrop && isBackdrop(event)) dismissDialog()
  pressedBackdrop = false
})

dialog.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && event.repeat) event.preventDefault()
})

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
  updateAudio()
  if (!document.hidden || screen !== 'game') return
  if (updatingRun) skipMoveAnimation = true
  stopGameplay()
  if (animationTimer !== undefined) {
    for (const animation of board.element.getAnimations({ subtree: true })) animation.cancel()
    refreshBoard()
    finishAnimation(false)
  }
  if (screen === 'game' && !pendingScreen) pause(true)
})

window.addEventListener('pagehide', () => {
  if (screen === 'ad') return
  exitLevel()
  if (screen === 'game') pause(true)
})

window.addEventListener('storage', (event) => {
  if (event.key !== 'parcel-pull.progress' || !storageAvailable) return
  const latest = readProgress(levels, legacyLevelIds)
  if (!latest.available) return
  progress.hints = latest.progress.hints
  progress.results = latest.progress.results
  updateHintButton()
  if (screen === 'hint' && !claimingHint) renderDialog()
})

updateCopy()
renderDialog()
platform = await createPlatform()
platform.loadingStart()
platform.watchMuted?.((muted) => {
  platformMuted = muted
  updateAudio()
})
if (loaded.migrated && storageAvailable) await save({})
reportCompletion()
screen = 'menu'
updateAudio()
refreshBoard()
game.hidden = false
renderDialog()
platform.loadingStop()
