import { deepStrictEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'
import { createPokiPlatform } from './poki.ts'
import type { PokiSdk } from './poki.ts'

function fakeSdk(overrides: Partial<PokiSdk>): PokiSdk {
  return {
    init: async () => undefined,
    gameLoadingFinished: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    commercialBreak: async () => undefined,
    rewardedBreak: async () => false,
    ...overrides,
  }
}

test('Poki forwards loading completion and gameplay signals', () => {
  const signals: string[] = []
  const platform = createPokiPlatform(fakeSdk({
    gameLoadingFinished: () => { signals.push('gameLoadingFinished') },
    gameplayStart: () => { signals.push('gameplayStart') },
    gameplayStop: () => { signals.push('gameplayStop') },
  }))

  platform.loadingStart()
  platform.loadingStop()
  platform.gameplayStart()
  platform.gameplayStop()
  equal(platform.supportsAd('interstitial'), true)
  equal(platform.supportsAd('rewarded'), true)
  deepStrictEqual(signals, ['gameLoadingFinished', 'gameplayStart', 'gameplayStop'])
})

test('Poki distinguishes a played break from an impression the SDK skips', async () => {
  const played = createPokiPlatform(fakeSdk({ commercialBreak: async (start) => { start() } }))
  equal(await played.requestAd('interstitial'), 'completed')
  equal(await createPokiPlatform(fakeSdk({})).requestAd('interstitial'), 'unavailable')
})

test('Poki grants a reward only on confirmation and normalizes skips and errors', async () => {
  const rewarded = createPokiPlatform(fakeSdk({ rewardedBreak: async () => true }))
  const skipped = createPokiPlatform(fakeSdk({ rewardedBreak: async (start) => { start(); return false } }))
  const aborted = createPokiPlatform(fakeSdk({
    rewardedBreak: async () => { throw new DOMException('Aborted', 'AbortError') },
  }))
  const failed = createPokiPlatform(fakeSdk({
    rewardedBreak: async () => { throw new Error('SDK request failed') },
  }))

  equal(await rewarded.requestAd('rewarded'), 'completed')
  equal(await skipped.requestAd('rewarded'), 'cancelled')
  equal(await aborted.requestAd('rewarded'), 'cancelled')
  equal(await failed.requestAd('rewarded'), 'error')
  equal(await createPokiPlatform(fakeSdk({})).requestAd('rewarded'), 'unavailable')
})

test('Poki measures game events without duplicating SDK ad impressions and outcomes', () => {
  const measures: string[][] = []
  const platform = createPokiPlatform(fakeSdk({
    measure: (...event) => { measures.push(event) },
  }))

  platform.record({ type: 'level_start', level: 3, moves: 0 })
  platform.record({ type: 'level_win', level: 3, moves: 8, durationMs: 4000 })
  platform.record({ type: 'level_blocked', level: 4, moves: 3 })
  platform.record({ type: 'level_exit', level: 4, moves: 2 })
  platform.record({ type: 'hint_use', level: 6, moves: 5, source: 'free' })
  platform.record({ type: 'hint_use', level: 7, moves: 5, source: 'rewarded' })
  platform.record({ type: 'ad_request', level: 7, moves: 4, placement: 'rewarded' })
  platform.record({ type: 'ad_outcome', level: 7, moves: 4, placement: 'rewarded', outcome: 'completed' })

  deepStrictEqual(measures, [
    ['level', '3', 'start'],
    ['level', '3', 'complete'],
    ['level', '4', 'blocked'],
    ['level', '4', 'exit'],
    ['hint', '6', 'free'],
    ['hint', '7', 'rewarded'],
  ])
})
