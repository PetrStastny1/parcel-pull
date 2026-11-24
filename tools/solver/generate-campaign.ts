import manifest from '../../src/levels/boards.json' with { type: 'json' }
import { curateCampaign } from './campaign.ts'
import { campaignCandidates } from './candidates.ts'

const candidates = campaignCandidates(manifest.slice(0, 12))
const result = process.argv.includes('--selection') ? curateCampaign(candidates) : candidates
process.stdout.write(`${JSON.stringify(result)}\n`)
