import type { campaignCandidates } from './candidates.ts'

const curatedAttempts = [
  [6152, 13454, 21810, 18249],
  [2223, 42661, 10369, 9892, 38851, 20509, 23880, 16012, 31080, 29350, 48597, 24612],
  [39349, 6654, 37841, 13183, 15498, 112, 48093, 3432, 41337, 51188, 234011, 28061],
]

export function curateCampaign({ phases, legacy }: ReturnType<typeof campaignCandidates>) {
  const legacyLevelIds: Record<number, number> = {}
  let levelId = 12

  const levels = curatedAttempts.flatMap((attempts, phaseIndex) => {
    const phase = phases[phaseIndex]
    return attempts.map((attempt) => {
      const historical = phaseIndex === curatedAttempts.length - 1
        ? legacy.find((candidate) => candidate.attempt === attempt)
        : undefined
      const candidate = historical ?? phase.accepted.find((entry) => entry.attempt === attempt)
      if (!candidate) throw new Error(`Seed ${phase.seed} did not produce curated attempt ${attempt}`)

      const id = ++levelId
      if (historical) legacyLevelIds[historical.previousId] = id
      return { ...candidate, id, seed: phase.seed }
    })
  })

  return { levels, legacyLevelIds }
}
