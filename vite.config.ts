import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, isPreview, mode }) => {
  const platform = loadEnv(mode, process.cwd(), 'VITE_PLATFORM').VITE_PLATFORM
  const portalBuild = platform === 'crazygames' || platform === 'poki'
  return { base: (command === 'build' || isPreview) && !portalBuild ? '/parcel-pull/' : './' }
})
