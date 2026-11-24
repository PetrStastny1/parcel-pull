import type { Page } from '@playwright/test'
import type { AdKind, AdOutcome, GameEvent } from '../src/platform/contract.ts'
import { legacyLevelIds, levels } from '../src/levels/index.ts'
import { shortestRoute } from '../tools/solver/solve.ts'
import cs from '../src/i18n/cs.json' with { type: 'json' }
import en from '../src/i18n/en.json' with { type: 'json' }
import { expect, test } from './fixtures.ts'

type Signal = 'loadingStart' | 'loadingStop' | 'gameplayStart' | 'gameplayStop'
type Trace = {
  signals: Signal[]
  events: GameEvent[]
  requests: AdKind[]
  completion: number[]
}
type Controls = {
  trace: Trace
  setHidden(hidden: boolean): void
  finishAd(outcome: AdOutcome): void
  setMuted(muted: boolean): void
  masterGain(): number | undefined
  releaseLock?: () => void
}

declare global {
  interface Window {
    __parcelScenario: Controls
  }
}

const progressKey = 'parcel-pull.progress'
const recommendation = '.magnet.hint-magnet'
const firstSix = [
  'W1A W1A',
  'W1 S1A S1A',
  'E3B N3A N3A N3A E3B E3B',
  'W1 S2A E1 S2A S2A E3B E3B',
  'W2 N1A W2 N1A E1B E1B E1B E1B',
  'E1B W3 N1 N1 E1B N3A E1B E1B E1B',
]

test.use({ locale: 'en-US', reducedMotion: 'reduce' })

async function installPlatform(page: Page, supportedAds: AdKind[] = [], initiallyMuted = false) {
  await page.addInitScript(({ supportedAds, initiallyMuted }) => {
    const trace: Trace = { signals: [], events: [], requests: [], completion: [] }
    let muted = initiallyMuted
    let mutedListener: ((muted: boolean) => void) | undefined
    let hidden = false
    let resolveAd: ((outcome: AdOutcome) => void) | undefined
    let master: GainNode | undefined
    const createGain = AudioContext.prototype.createGain
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this)
      master ??= gain
      return gain
    }
    Object.defineProperty(document, 'hidden', { get: () => hidden })
    window.__parcelScenario = {
      trace,
      masterGain: () => master?.gain.value,
      setHidden: (value) => {
        hidden = value
        document.dispatchEvent(new Event('visibilitychange'))
      },
      setMuted: (value) => {
        muted = value
        mutedListener?.(muted)
      },
      finishAd: (outcome) => {
        if (!resolveAd) throw new Error('No ad is pending')
        const finish = resolveAd
        resolveAd = undefined
        finish(outcome)
      },
    }
    window.__parcelTestPlatform = {
      supportsAd: (kind) => supportedAds.includes(kind),
      requestAd: (kind) => {
        trace.requests.push(kind)
        return new Promise<AdOutcome>((resolve) => { resolveAd = resolve })
      },
      loadingStart: () => { trace.signals.push('loadingStart') },
      loadingStop: () => { trace.signals.push('loadingStop') },
      gameplayStart: () => { trace.signals.push('gameplayStart') },
      gameplayStop: () => { trace.signals.push('gameplayStop') },
      record: (event) => { trace.events.push(event) },
      recordCompletion: (percentage) => { trace.completion.push(percentage) },
      watchMuted: (listener) => {
        mutedListener = listener
        listener(muted)
      },
    }
  }, { supportedAds, initiallyMuted })
}

function action(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

async function pull(page: Page, route: string) {
  for (const id of route.split(' ')) {
    await page.locator(`button[data-magnet="${id}"]`).click()
  }
}

async function playThrough(page: Page, number: number) {
  await page.goto('/')
  await action(page, en.play).click()
  for (const [index, route] of firstSix.slice(0, number).entries()) {
    await pull(page, route)
    await expect(page.getByRole('heading', { name: en.levelWon.replace('{count}', String(index + 1)) })).toBeVisible()
    await action(page, en.next).click()
  }
}

function collected(page: Page) {
  return page.evaluate(() => window.__parcelScenario.trace)
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((hidden) => window.__parcelScenario.setHidden(hidden), hidden)
}

async function finishAd(page: Page, outcome: AdOutcome) {
  await page.evaluate((outcome) => window.__parcelScenario.finishAd(outcome), outcome)
}

function progressAfter(wins: number) {
  return Object.fromEntries(levels.slice(0, wins).map(({ id, minimum }) => [id, { moves: minimum, stars: 3 }]))
}

function seedProgress(page: Page, progress: object) {
  return page.addInitScript(({ key, saved }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(saved))
  }, { key: progressKey, saved: progress })
}

function storedProgress(page: Page) {
  return page.evaluate((key) => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as { version: number; hints: number; results: Record<number, { moves: number; stars: number }>; run: { level: number } } : undefined
  }, progressKey)
}

test('earns and uses a local hint without allowing a second claim on replay', async ({ page }) => {
  await playThrough(page, 3)
  await action(page, en.hint).click()
  await expect(page.getByText('Hints available: 1')).toBeVisible()
  await expect(action(page, en.watchAd)).toHaveCount(0)
  await action(page, en.useHint).click()
  await expect(page.locator(recommendation)).toHaveAttribute('data-magnet', 'W1')
  await expect(page.getByRole('status')).toContainText('Suggested magnet')
  await pull(page, 'W1')
  await expect(page.locator(recommendation)).toHaveCount(0)
  await action(page, en.restart).click()
  await expect(action(page, en.hint)).toBeDisabled()
  await pull(page, firstSix[3])
  await action(page, en.replay).click()
  await expect(action(page, en.hint)).toBeDisabled()
  await pull(page, firstSix[3])
  await expect.poll(async () => (await storedProgress(page))?.hints).toBe(0)

  await action(page, en.next).click()
  await pull(page, firstSix[4])
  await action(page, en.next).click()
  await pull(page, firstSix[5])
  await action(page, en.replay).click()
  await action(page, en.hint).click()
  await expect(page.getByText('Hints available: 1')).toBeVisible()
  await expect(action(page, en.useHint)).toBeVisible()
  await expect(action(page, en.watchAd)).toHaveCount(0)
})

test('hides a free recommendation after three active seconds', async ({ page }) => {
  await seedProgress(page, { version: 2, sound: true, hints: 1, results: progressAfter(4) })
  await page.clock.install()
  await page.goto('/')
  await action(page, en.continue).click()
  await action(page, en.hint).click()
  await action(page, en.useHint).click()
  await expect(page.locator(recommendation)).toHaveCount(1)
  await page.clock.runFor(2500)
  await expect(page.locator(recommendation)).toHaveCount(1)
  await page.clock.runFor(600)
  await expect(page.locator(recommendation)).toHaveCount(0)
})

test('pairs gameplay lifecycle and emits level events through blocking, undo and leaving', async ({ page }) => {
  await installPlatform(page)
  await page.clock.install()
  await page.goto('/')
  await expect(action(page, en.play)).toBeVisible()
  expect((await collected(page)).signals).toEqual(['loadingStart', 'loadingStop'])
  expect((await collected(page)).completion).toEqual([0])
  await action(page, en.play).click()
  await expect.poll(async () => (await collected(page)).signals).toEqual([
    'loadingStart', 'loadingStop', 'gameplayStart',
  ])
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))
  })
  await page.clock.runFor(200)
  await action(page, en.pause).click()
  await page.clock.runFor(4000)
  await action(page, en.resume).click()
  await expect.poll(async () => (await collected(page)).signals).toEqual([
    'loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop', 'gameplayStart',
  ])
  await page.clock.runFor(200)
  await pull(page, firstSix[0])
  await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  expect((await collected(page)).signals).toEqual([
    'loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop', 'gameplayStart', 'gameplayStop',
  ])
  expect((await collected(page)).events).toEqual([
    { type: 'level_start', level: 1, moves: 0 },
    { type: 'level_win', level: 1, moves: 2, durationMs: expect.any(Number) },
  ])
  const firstWin = (await collected(page)).events.find((event) => event.type === 'level_win')
  if (firstWin?.type !== 'level_win') throw new Error('Expected a win event')
  expect(firstWin.durationMs).toBeGreaterThanOrEqual(400)
  expect(firstWin.durationMs).toBeLessThan(4000)
  expect((await collected(page)).completion).toEqual([0, 100 / levels.length])
  await action(page, en.replay).click()
  await pull(page, firstSix[0])
  await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  expect((await collected(page)).completion).toEqual([0, 100 / levels.length])
  await action(page, en.next).click()
  await pull(page, firstSix[1])
  await action(page, en.next).click()
  await pull(page, 'E3B N2')
  await expect(page.getByRole('heading', { name: en.routeBlocked })).toBeVisible()
  expect((await collected(page)).events).toContainEqual({ type: 'level_blocked', level: 3, moves: 2 })
  const signalsBeforeUndo = (await collected(page)).signals
  await page.getByRole('dialog', { name: en.routeBlocked }).getByRole('button', { name: en.undo, exact: true }).click()
  await expect(page.getByRole('heading', { name: en.routeBlocked })).toHaveCount(0)
  expect((await collected(page)).signals).toEqual([...signalsBeforeUndo, 'gameplayStart'])
  await setHidden(page, true)
  await expect(page.getByRole('heading', { name: en.pause })).toBeVisible()
  expect((await collected(page)).signals.at(-1)).toBe('gameplayStop')
  await setHidden(page, false)
  await action(page, en.levels).click()
  await action(page, 'Level 1, stars: 3').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await collected(page)).events).toContainEqual({ type: 'level_exit', level: 3, moves: 1 })
  expect((await collected(page)).requests).toEqual([])
})

test('requests interstitials once on Next and waits for visible Resume after an ad', async ({ page }) => {
  await installPlatform(page, ['interstitial'])
  await page.goto('/')
  await action(page, en.play).click()
  await pull(page, firstSix[0])
  await action(page, en.replay).click()
  await pull(page, firstSix[0])
  await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  expect((await collected(page)).requests).toEqual([])
  const beforeAd = (await collected(page)).signals
  await action(page, en.next).click()
  await expect(page.getByRole('heading', { name: en.adWaiting })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__parcelScenario.masterGain())).toBe(0)
  await page.keyboard.press('Escape')
  await page.keyboard.press('z')
  await page.keyboard.press('r')
  await expect(page.getByRole('heading', { name: en.adWaiting })).toBeVisible()
  await expect(page.locator('.moves')).toHaveText('Moves: 2')
  await setHidden(page, true)
  expect((await collected(page)).signals).toEqual(beforeAd)
  expect((await collected(page)).requests).toEqual(['interstitial'])
  await finishAd(page, 'error')
  await expect(page.getByRole('heading', { name: en.pause })).toBeVisible()
  await expect(page.locator('.level-label')).toHaveText('Level 2')
  expect((await collected(page)).signals).toEqual(beforeAd)
  await setHidden(page, false)
  await action(page, en.resume).click()
  expect((await collected(page)).signals).toEqual([...beforeAd, 'gameplayStart'])
  await expect.poll(() => page.evaluate(() => window.__parcelScenario.masterGain())).toBeCloseTo(0.2)
  await pull(page, firstSix[1])
  await action(page, en.next).click()
  await expect(page.getByRole('heading', { name: en.adWaiting })).toBeVisible()
  await finishAd(page, 'cancelled')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.level-label')).toHaveText('Level 3')
  expect((await collected(page)).events.filter(({ type }) => type === 'ad_request' || type === 'ad_outcome')).toEqual([
    { type: 'ad_request', placement: 'interstitial', level: 1, moves: 2 },
    { type: 'ad_outcome', placement: 'interstitial', outcome: 'error', level: 1, moves: 2 },
    { type: 'ad_request', placement: 'interstitial', level: 2, moves: 3 },
    { type: 'ad_outcome', placement: 'interstitial', outcome: 'cancelled', level: 2, moves: 3 },
  ])
})

test('offers video from level six and delays the only rewarded hint until visible play', async ({ page }) => {
  await installPlatform(page, ['rewarded'])
  await playThrough(page, 3)
  for (const index of [3, 4]) {
    await action(page, en.hint).click()
    await expect(action(page, en.watchAd)).toHaveCount(0)
    await action(page, en.resume).click()
    await pull(page, firstSix[index])
    await action(page, en.next).click()
  }
  await action(page, en.hint).click()
  await action(page, en.watchAd).click()
  await expect(page.getByRole('heading', { name: en.adWaiting })).toBeVisible()
  const beforeReward = (await collected(page)).signals
  await setHidden(page, true)
  await finishAd(page, 'completed')
  await expect(page.getByRole('heading', { name: en.pause })).toBeVisible()
  await expect(page.locator(recommendation)).toHaveCount(0)
  expect((await collected(page)).signals).toEqual(beforeReward)
  await setHidden(page, false)
  await action(page, en.resume).click()
  await expect(page.locator(recommendation)).toHaveAttribute('data-magnet', 'E1B')
  expect((await collected(page)).signals).toEqual([...beforeReward, 'gameplayStart'])
  expect((await collected(page)).events.filter(({ type }) => type === 'hint_use')).toEqual([
    { type: 'hint_use', source: 'rewarded', level: 6, moves: 0 },
  ])
  expect((await storedProgress(page))?.hints).toBe(1)
  await action(page, en.restart).click()
  await expect(action(page, en.hint)).toBeDisabled()
  await pull(page, firstSix[5])
  await action(page, en.replay).click()
  await expect(action(page, en.hint)).toBeDisabled()
  expect((await collected(page)).requests).toEqual(['rewarded'])
})

for (const { locale, copy, outcome, viewport } of [
  { locale: 'en-US', copy: en, outcome: 'error', viewport: { width: 568, height: 320 } },
  { locale: 'cs-CZ', copy: cs, outcome: 'cancelled', viewport: { width: 320, height: 480 } },
] as const) {
  test.describe(locale, () => {
    test.use({ locale, viewport })

    test(`keeps the free action and accessible dialog when rewarded returns ${outcome}`, async ({ page }) => {
      await installPlatform(page, ['rewarded'])
      await seedProgress(page, { version: 2, sound: true, hints: 1, results: progressAfter(5) })
      await page.goto('/')
      await action(page, copy.continue).click()
      await action(page, copy.hint).click()
      await expect(page.getByRole('dialog', { name: copy.hint })).toBeVisible()
      const video = action(page, copy.watchAd)
      const resume = action(page, copy.resume)
      const videoSize = await video.boundingBox()
      const resumeSize = await resume.boundingBox()
      expect(videoSize?.width).toBeGreaterThanOrEqual(44)
      expect(videoSize?.height).toBeGreaterThanOrEqual(44)
      expect(videoSize?.width).toBe(resumeSize?.width)
      expect(videoSize?.height).toBe(resumeSize?.height)
      expect(await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth > innerWidth,
        vertical: document.documentElement.scrollHeight > innerHeight,
      }))).toEqual({ horizontal: false, vertical: false })
      await video.click()
      await expect(page.getByRole('dialog', { name: copy.adWaiting })).toBeVisible()
      await finishAd(page, outcome)
      await expect(page.getByRole('alert')).toHaveText(copy.videoUnavailable)
      await expect(page.locator(recommendation)).toHaveCount(0)
      await expect(video).toHaveCount(0)
      await expect(resume).toBeVisible()
      expect((await collected(page)).events.filter(({ type }) => type === 'hint_use')).toEqual([])
      await resume.click()
      await action(page, copy.restart).click()
      await action(page, copy.hint).click()
      await expect(video).toHaveCount(0)
      await expect(action(page, copy.useHint)).toBeVisible()

      await resume.click()
      await pull(page, firstSix[5])
      await action(page, copy.replay).click()
      await action(page, copy.hint).click()
      await expect(video).toHaveCount(0)
      await expect(action(page, copy.useHint)).toBeVisible()
      await action(page, copy.useHint).click()
      await expect(page.locator(recommendation)).toHaveCount(1)
      expect((await collected(page)).events.filter(({ type }) => type === 'hint_use')).toEqual([
        { type: 'hint_use', source: 'free', level: 6, moves: 0 },
      ])
      expect((await collected(page)).requests).toEqual(['rewarded'])
    })
  })
}

test('combines real audio gain with portal mute, the user setting and visibility', async ({ page }) => {
  await installPlatform(page, [], true)
  await page.goto('/')
  await action(page, en.play).click()
  const gain = () => page.evaluate(() => window.__parcelScenario.masterGain())
  await expect.poll(gain).toBe(0)
  await page.evaluate(() => window.__parcelScenario.setMuted(false))
  await expect.poll(gain).toBeCloseTo(0.2)
  await action(page, en.pause).click()
  await action(page, en.settings).click()
  const sound = page.getByRole('checkbox', { name: en.sound })
  await expect(sound).toBeChecked()
  await sound.uncheck()
  await page.evaluate(() => {
    window.__parcelScenario.setMuted(true)
    window.__parcelScenario.setMuted(false)
  })
  await expect.poll(gain).toBe(0)
  await expect(sound).not.toBeChecked()
  await sound.check()
  await action(page, en.back).click()
  await action(page, en.resume).click()
  await setHidden(page, true)
  await expect.poll(gain).toBe(0)
  await setHidden(page, false)
  await expect.poll(gain).toBeCloseTo(0.2)
  await action(page, en.settings).click()
  await expect(sound).toBeChecked()
})

test('migrates legacy wins and the real partial board without granting adjacent levels', async ({ page }) => {
  const previousWin = legacyLevelIds[13]
  const previousRun = legacyLevelIds[14]
  const winLevel = levels[previousWin - 1]
  const runLevel = levels[previousRun - 1]
  const route = shortestRoute(runLevel)
  if (!route?.moves.length) throw new Error('Expected a route for the migrated board')
  await installPlatform(page)
  await seedProgress(page, {
    version: 1,
    language: 'cs',
    sound: false,
    results: { ...progressAfter(12), 13: { moves: winLevel.minimum + 2, stars: 2 } },
    run: { level: 14, positions: route.moves[0].after, history: [runLevel.initial], won: false },
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
  await expect(action(page, cs.continue)).toBeVisible()
  expect((await collected(page)).completion).toEqual([1300 / levels.length])
  const saved = await storedProgress(page)
  expect(saved?.version).toBe(2)
  expect(saved?.run.level).toBe(previousRun)
  expect(saved?.results[previousWin]).toEqual({ moves: winLevel.minimum + 2, stars: 2 })
  expect(saved?.hints).toBe(3)
  await action(page, cs.continue).click()
  await expect(page.locator('.level-label')).toHaveText(cs.level.replace('{count}', String(previousRun)))
  await expect(page.locator('.moves')).toHaveText(cs.moves.replace('{count}', '1'))
  await expect.poll(() => page.evaluate(() => window.__parcelScenario.masterGain())).toBe(0)
  await action(page, cs.pause).click()
  await action(page, cs.levels).click()
  await expect(page.locator(`button[data-level="${previousWin}"]`)).toBeEnabled()
  const frontier = previousWin === 13 ? 14 : 13
  await expect(page.locator(`button[data-level="${frontier}"]`)).toBeEnabled()
  await expect(page.locator(`button[data-level="${frontier + 1}"]`)).toBeDisabled()
  await action(page, cs.back).click()
  await action(page, cs.resume).click()
  await action(page, cs.hint).click()
  await action(page, cs.useHint).click()
  await expect(page.locator(recommendation)).toHaveCount(1)
  await page.reload()
  await expect(action(page, cs.continue)).toBeVisible()
  expect((await storedProgress(page))?.hints).toBe(2)
})

test('keeps the blocked screen intact while Undo waits for its storage lock', async ({ page }) => {
  await installPlatform(page)
  await playThrough(page, 2)
  await pull(page, 'E3B N2')
  await expect(page.getByRole('heading', { name: en.routeBlocked })).toBeVisible()
  await page.evaluate((key) => new Promise<void>((locked) => {
    void navigator.locks.request(key, () => new Promise<void>((release) => {
      window.__parcelScenario.releaseLock = release
      locked()
    }))
  }), progressKey)
  try {
    await page.getByRole('dialog', { name: en.routeBlocked }).getByRole('button', { name: en.undo, exact: true }).click()
    const levelsButton = action(page, en.levels)
    if (await levelsButton.isEnabled()) await levelsButton.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: en.routeBlocked })).toBeVisible()
  } finally {
    await page.evaluate(() => window.__parcelScenario.releaseLock?.())
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.moves')).toHaveText('Moves: 1')
})

for (const { locale, copy } of [{ locale: 'en-US', copy: en }, { locale: 'cs-CZ', copy: cs }] as const) {
  test.describe(`${locale} accessible states`, () => {
    test.use({ locale })

    test('renders localized loading and blocked states', async ({ page }) => {
      await installPlatform(page)
      await seedProgress(page, { version: 1, sound: true, results: progressAfter(2) })
      await page.addInitScript((key) => {
        void navigator.locks.request(key, () => new Promise<void>((release) => {
          window.__parcelScenario.releaseLock = release
        }))
      }, progressKey)
      await page.goto('/', { waitUntil: 'commit' })
      try {
        await expect(page.getByRole('dialog', { name: copy.title })).toBeVisible()
        await expect(page.getByRole('dialog').getByRole('status')).toHaveText(copy.loading)
      } finally {
        await page.evaluate(() => window.__parcelScenario.releaseLock?.())
      }
      await action(page, copy.continue).click()
      await pull(page, 'E3B N2')
      await expect(page.getByRole('dialog', { name: copy.routeBlocked })).toBeVisible()
    })
  })
}
