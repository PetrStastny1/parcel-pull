import { defineConfig } from 'vite'

// GitHub Pages serves the build under /parcel-pull/; dev and e2e keep the root path.
export default defineConfig(({ command }) => ({ base: command === 'build' ? '/parcel-pull/' : './' }))
