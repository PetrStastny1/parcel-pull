import type { Platform } from './contract.ts'
import { createCrazyGamesPlatform } from './crazygames.ts'
import type { CrazyGamesSdk } from './crazygames.ts'
import { createPokiPlatform } from './poki.ts'
import type { PokiSdk } from './poki.ts'

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk }
    PokiSDK?: PokiSdk
  }
}

const localPlatform: Platform = {
  supportsAd: () => false,
  requestAd: async (kind) => kind === 'interstitial' ? 'completed' : 'unavailable',
  loadingStart: () => undefined,
  loadingStop: () => undefined,
  gameplayStart: () => undefined,
  gameplayStop: () => undefined,
  record: () => undefined,
}

const sdkSources = {
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
}
type Portal = keyof typeof sdkSources
const sdkStartupBudgetMs = 1_800

async function initializePortal(portal: Portal): Promise<Platform> {
  if (portal === 'crazygames') {
    const sdk = window.CrazyGames?.SDK
    if (!sdk) return localPlatform
    await sdk.init()
    if (sdk.environment !== 'crazygames' && sdk.environment !== 'local') return localPlatform
    return createCrazyGamesPlatform(sdk, import.meta.env.VITE_CRAZYGAMES_LAUNCH === 'basic')
  }

  const sdk = window.PokiSDK
  if (!sdk) return localPlatform
  await sdk.init()
  return createPokiPlatform(sdk)
}

export async function createPlatform(): Promise<Platform> {
  if (import.meta.env.DEV && window.__parcelTestPlatform) return window.__parcelTestPlatform

  const portal: unknown = import.meta.env.VITE_PLATFORM
  if (portal !== 'crazygames' && portal !== 'poki') return localPlatform

  const script = document.createElement('script')
  script.src = sdkSources[portal]
  const events = new AbortController()
  const once = { once: true, signal: events.signal }
  let deadline: number | undefined

  try {
    const startup = new Promise<Platform>((resolve, reject) => {
      deadline = window.setTimeout(() => resolve(localPlatform), sdkStartupBudgetMs)
      script.addEventListener('error', () => resolve(localPlatform), once)
      script.addEventListener('load', () => {
        void initializePortal(portal).then(resolve, reject)
      }, once)
      document.head.append(script)
    })

    const platform = await startup
    if (platform === localPlatform) script.remove()
    return platform
  } catch {
    script.remove()
    return localPlatform
  } finally {
    window.clearTimeout(deadline)
    events.abort()
  }
}
