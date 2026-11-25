import type { AdOutcome, Platform } from './contract.ts'

interface CrazyGamesAdCallbacks {
  adStarted(): void
  adFinished(): void
  adError(cause: unknown): void
}

export interface CrazyGamesSdk {
  init(): Promise<void>
  readonly environment: 'crazygames' | 'local' | 'disabled'
  readonly ad: {
    requestAd(kind: 'midgame' | 'rewarded', callbacks: CrazyGamesAdCallbacks): Promise<void>
  }
  readonly game: {
    loadingStart(): void
    loadingStop(): void
    gameplayStart(): void
    gameplayStop(): void
    reportGameCompletedPercentage?(percentage: number): void
    readonly settings: { muteAudio: boolean }
    addSettingsChangeListener(listener: (settings: { muteAudio: boolean }) => void): void
  }
}

function adFailure(cause: unknown): AdOutcome {
  if (cause instanceof Error && cause.name === 'AbortError') return 'cancelled'
  if (typeof cause !== 'object' || cause === null || !('code' in cause)) return 'error'

  switch (cause.code) {
    case 'adsDisabled':
    case 'unfilled':
    case 'adblock':
    case 'adCooldown':
      return 'unavailable'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'error'
  }
}

export function createCrazyGamesPlatform(sdk: CrazyGamesSdk, basicLaunch: boolean): Platform {
  return {
    supportsAd: () => !basicLaunch,
    requestAd: async (kind) => {
      if (basicLaunch) return 'unavailable'

      return new Promise<AdOutcome>((resolve) => {
        try {
          void sdk.ad.requestAd(kind === 'interstitial' ? 'midgame' : 'rewarded', {
            adStarted: () => undefined,
            adFinished: () => resolve('completed'),
            adError: (cause) => resolve(adFailure(cause)),
          }).catch((cause: unknown) => resolve(adFailure(cause)))
        } catch (cause) {
          resolve(adFailure(cause))
        }
      })
    },
    loadingStart: () => sdk.game.loadingStart(),
    loadingStop: () => sdk.game.loadingStop(),
    gameplayStart: () => sdk.game.gameplayStart(),
    gameplayStop: () => sdk.game.gameplayStop(),
    record: () => undefined,
    // The SDK accepts whole percentages and must report 100 only at real completion.
    recordCompletion: (percentage) => sdk.game.reportGameCompletedPercentage?.(Math.floor(percentage)),
    watchMuted: (listener) => {
      listener(sdk.game.settings.muteAudio)
      sdk.game.addSettingsChangeListener(({ muteAudio }) => listener(muteAudio))
    },
  }
}
