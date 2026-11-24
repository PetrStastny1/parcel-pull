import manifest from '../../src/levels/boards.json' with { type: 'json' }
import { selectHardLevels } from './candidates.ts'

process.stdout.write(`${JSON.stringify(selectHardLevels(manifest.slice(0, 12)), null, 2)}\n`)
