import type { Platform } from './contract.ts'

export async function createPlatform(): Promise<Platform> {
  if (import.meta.env.DEV && window.__parcelTestPlatform) return window.__parcelTestPlatform
  return {
    supportsAd: () => false,
    requestAd: async (kind) => kind === 'interstitial' ? 'completed' : 'unavailable',
    loadingStart: () => undefined,
    loadingStop: () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    record: () => undefined,
  }
}
