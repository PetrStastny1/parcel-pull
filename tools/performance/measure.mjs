import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import { levels } from '../../src/levels/index.ts'
import { shortestRoute } from '../solver/solve.ts'

const baseURL = process.env.PARCEL_PREVIEW_URL ?? 'http://127.0.0.1:4240/parcel-pull/'
const browser = await chromium.launch({
  args: process.env.PARCEL_TEST_SINGLE_PROCESS ? ['--single-process'] : [],
})

try {
  const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 100, downloadThroughput: 625000, uploadThroughput: 625000,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const ownResponses = new Set()
  const externalResponses = new Set()
  const firstOrigin = new URL(baseURL).origin
  page.on('response', (response) => {
    const address = new URL(response.url())
    if (address.origin === firstOrigin) ownResponses.add(address.pathname)
    else externalResponses.add(address.href)
  })
  await page.goto(baseURL, { waitUntil: 'commit' })
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await play.waitFor()
  if (!(await play.isEnabled())) throw new Error('Play is not enabled')
  const playableMs = await page.evaluate(() => Math.round(performance.now()))
  const files = new Set(readdirSync('dist', { recursive: true }).map((name) => String(name)))
  let gzipBytes = 0
  const requested = [...ownResponses]
  for (const resource of requested) {
    const prefix = new URL(baseURL).pathname
    const asset = decodeURIComponent(resource.slice(prefix.length)) || 'index.html'
    if (!resource.startsWith(prefix) || !files.has(asset)) throw new Error(`Unexpected initial asset ${resource}`)
    gzipBytes += gzipSync(readFileSync(resolve('dist', asset))).byteLength
  }

  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await play.click()
  for (const level of levels.slice(0, 11)) {
    const route = shortestRoute(level)
    if (!route) throw new Error(`Level ${level.id} has no route`)
    for (const { magnet } of route.moves) {
      await page.locator(`[data-magnet="${magnet.id}"]`).click()
    }
    await page.getByRole('button', { name: 'Next level', exact: true }).click()
  }

  const route = shortestRoute(levels[11])
  if (!route || route.minimum < 10) throw new Error('Expected at least ten moves in the measurement level')
  const magnets = route.moves.slice(0, 10).map(({ magnet }) => magnet.id)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const animation = await page.evaluate(async (magnets) => {
    const intervals = []
    const longTasks = []
    const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map(({ duration }) => duration)))
    observer.observe({ entryTypes: ['longtask'] })
    for (const magnet of magnets) {
      await new Promise((finish) => requestAnimationFrame((start) => {
        document.querySelector(`button[data-magnet="${magnet}"]`).click()
        let previous = start
        function frame(now) {
          intervals.push(now - previous)
          previous = now
          if (now - start >= 160) finish()
          else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }))
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    const moves = document.querySelector('.moves').textContent
    observer.disconnect()
    return {
      moves,
      frames: intervals.length,
      within17: intervals.filter((interval) => interval <= 17).length,
      maximumIntervalMs: Math.max(...intervals),
      longTasks,
    }
  }, magnets)
  const result = { playableMs, gzipBytes, requested, externalResponses: [...externalResponses], animation }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (playableMs > 2000 || gzipBytes > 500_000 || externalResponses.size ||
      animation.moves !== 'Moves: 10' || animation.within17 / animation.frames < 0.95 ||
      animation.longTasks.some((duration) => duration > 50)) process.exitCode = 1
} finally {
  await browser.close()
}
