import { writeFileSync } from 'node:fs'
import { boards } from '../../src/levels/boards.ts'
import { solve } from './solve.ts'

const levels = boards.map((board) => Object.fromEntries(solve(board).winning))
const json = levels.map((level) => `  ${JSON.stringify(level)}`).join(',\n')
writeFileSync(new URL('../../src/levels/distances.json', import.meta.url), `[\n${json}\n]\n`)
