import type { Platform } from './contract.ts'

export interface PokiSdk {
  init(): Promise<void>
  gameLoadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(onAdStarted: () => void): Promise<void>
  rewardedBreak(onAdStarted: () => void): Promise<boolean>
  measure?(category: string, what: string, action: string): void
}

export function createPokiPlatform(sdk: PokiSdk): Platform {
  return {
    supportsAd: () => true,
    requestAd: async (kind) => {
      let started = false
      const markStarted = () => { started = true }

      try {
        if (kind === 'interstitial') {
          await sdk.commercialBreak(markStarted)
          return started ? 'completed' : 'unavailable'
        }

        if (await sdk.rewardedBreak(markStarted) === true) return 'completed'
        return started ? 'cancelled' : 'unavailable'
      } catch (cause) {
        return cause instanceof Error && cause.name === 'AbortError' ? 'cancelled' : 'error'
      }
    },
    loadingStart: () => undefined,
    loadingStop: () => sdk.gameLoadingFinished(),
    gameplayStart: () => sdk.gameplayStart(),
    gameplayStop: () => sdk.gameplayStop(),
    record: (event) => {
      const level = String(event.level)

      switch (event.type) {
        case 'level_start':
          sdk.measure?.('level', level, 'start')
          break
        case 'level_win':
          sdk.measure?.('level', level, 'complete')
          break
        case 'level_blocked':
          sdk.measure?.('level', level, 'blocked')
          break
        case 'level_exit':
          sdk.measure?.('level', level, 'exit')
          break
        case 'hint_use':
          sdk.measure?.('hint', level, event.source)
          break
      }
    },
  }
}
