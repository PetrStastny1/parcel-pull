import { deepStrictEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createCrazyGamesPlatform } from './crazygames.ts'
import type { CrazyGamesSdk } from './crazygames.ts'

function fakeSdk(requestAd: CrazyGamesSdk['ad']['requestAd'], signals: string[] = []): CrazyGamesSdk {
  return {
    init: async () => undefined,
    environment: 'local',
    ad: { requestAd },
    game: {
      loadingStart: () => { signals.push('loadingStart') },
      loadingStop: () => { signals.push('loadingStop') },
      gameplayStart: () => { signals.push('gameplayStart') },
      gameplayStop: () => { signals.push('gameplayStop') },
      settings: { muteAudio: false },
      addSettingsChangeListener: () => undefined,
    },
  }
}

test('CrazyGames forwards lifecycle signals but never requests ads in Basic Launch', async () => {
  const signals: string[] = []
  const platform = createCrazyGamesPlatform(fakeSdk(async () => { signals.push('ad') }, signals), true)

  platform.loadingStart()
  platform.loadingStop()
  platform.gameplayStart()
  platform.gameplayStop()
  for (const kind of ['interstitial', 'rewarded'] as const) {
    equal(platform.supportsAd(kind), false)
    equal(await platform.requestAd(kind), 'unavailable')
  }
  deepStrictEqual(signals, ['loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop'])
})

test('CrazyGames reports the first terminal callback for each mapped ad placement', async () => {
  const placements: string[] = []
  const platform = createCrazyGamesPlatform(fakeSdk(async (kind, callbacks) => {
    placements.push(kind)
    if (kind === 'midgame') {
      callbacks.adStarted()
      callbacks.adFinished()
      callbacks.adError({ code: 'other' })
    } else {
      callbacks.adError({ code: 'cancelled' })
      callbacks.adFinished()
    }
  }), false)

  equal(platform.supportsAd('interstitial'), true)
  equal(platform.supportsAd('rewarded'), true)
  equal(await platform.requestAd('interstitial'), 'completed')
  equal(await platform.requestAd('rewarded'), 'cancelled')
  deepStrictEqual(placements, ['midgame', 'rewarded'])
})

test('CrazyGames waits for ad completion after the rewarded request is accepted', async () => {
  const finishedCallbacks: (() => void)[] = []
  const platform = createCrazyGamesPlatform(fakeSdk(async (_kind, { adStarted, adFinished }) => {
    adStarted()
    finishedCallbacks.push(adFinished)
  }), false)
  const outcomes: string[] = []
  const result = platform.requestAd('rewarded').then((outcome) => { outcomes.push(outcome) })

  await setImmediate()
  deepStrictEqual(outcomes, [])
  finishedCallbacks[0]()
  await result
  deepStrictEqual(outcomes, ['completed'])
})

test('CrazyGames distinguishes SDK unavailability, cancellation, and technical failures', async () => {
  const errors = [
    [{ code: 'adsDisabled' }, 'unavailable'],
    [{ code: 'unfilled' }, 'unavailable'],
    [{ code: 'adblock' }, 'unavailable'],
    [{ code: 'adCooldown' }, 'unavailable'],
    [{ code: 'other' }, 'error'],
    [new DOMException('Aborted', 'AbortError'), 'cancelled'],
    [new Error('SDK request failed'), 'error'],
  ] as const

  for (const [cause, result] of errors) {
    const callback = createCrazyGamesPlatform(fakeSdk(async (_kind, { adError }) => adError(cause)), false)
    const rejected = createCrazyGamesPlatform(fakeSdk(async () => { throw cause }), false)
    const thrown = createCrazyGamesPlatform(fakeSdk(() => { throw cause }), false)
    equal(await callback.requestAd('rewarded'), result)
    equal(await rejected.requestAd('rewarded'), result)
    equal(await thrown.requestAd('rewarded'), result)
  }
})

test('CrazyGames reports the initial portal mute setting and subsequent changes', () => {
  const sdk = fakeSdk(async () => undefined)
  const listeners: ((settings: { muteAudio: boolean }) => void)[] = []
  const platform = createCrazyGamesPlatform({
    ...sdk,
    game: {
      ...sdk.game,
      settings: { muteAudio: true },
      addSettingsChangeListener: (listener) => { listeners.push(listener) },
    },
  }, false)
  const muted: boolean[] = []

  platform.watchMuted?.((value) => { muted.push(value) })
  equal(listeners.length, 1)
  listeners[0]({ muteAudio: false })
  listeners[0]({ muteAudio: true })
  deepStrictEqual(muted, [true, false, true])
})

test('CrazyGames forwards exact campaign completion when supported by the SDK', () => {
  const sdk = fakeSdk(async () => undefined)
  const percentages: number[] = []
  const platform = createCrazyGamesPlatform({
    ...sdk,
    game: {
      ...sdk.game,
      reportGameCompletedPercentage: (percentage) => { percentages.push(percentage) },
    },
  }, false)

  platform.recordCompletion?.(2.5)
  platform.recordCompletion?.(100)
  createCrazyGamesPlatform(sdk, false).recordCompletion?.(100)
  deepStrictEqual(percentages, [2.5, 100])
})
