export type AdKind = 'interstitial' | 'rewarded'
export type AdOutcome = 'completed' | 'cancelled' | 'unavailable' | 'error'

type LevelEvent = { level: number; moves: number }

export type GameEvent = LevelEvent & (
  | { type: 'level_start' | 'level_blocked' | 'level_exit' }
  | { type: 'level_win'; durationMs: number }
  | { type: 'hint_use'; source: 'free' | 'rewarded' }
  | { type: 'ad_request'; placement: AdKind }
  | { type: 'ad_outcome'; placement: AdKind; outcome: AdOutcome }
)

export interface Platform {
  supportsAd(kind: AdKind): boolean
  requestAd(kind: AdKind): Promise<AdOutcome>
  loadingStart(): void
  loadingStop(): void
  gameplayStart(): void
  gameplayStop(): void
  record(event: GameEvent): void
  watchMuted?(listener: (muted: boolean) => void): void
}

declare global {
  interface Window {
    __parcelTestPlatform?: Platform
  }
}
