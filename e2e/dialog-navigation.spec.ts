import type { Page } from '@playwright/test'
import { levels } from '../src/levels/index.ts'
import { shortestRoute } from '../tools/solver/solve.ts'
import { expect, test } from './fixtures.ts'

test.use({ locale: 'en-US', reducedMotion: 'reduce', hasTouch: true })

const english = {
  close: 'Close', menu: 'Menu', settings: 'Settings', pause: 'Pause',
  levels: 'Levels', play: 'Play', continue: 'Continue', undo: 'Undo', next: 'Next level',
  won: 'Level 1 complete', summary: 'All levels complete', moves: 'Moves',
  completed: 'Completed levels', stars: 'Earned stars',
}
const czech: typeof english = {
  close: 'Zavřít', menu: 'Menu', settings: 'Nastavení', pause: 'Pauza',
  levels: 'Úrovně', play: 'Hrát', continue: 'Pokračovat', undo: 'Zpět o tah', next: 'Další úroveň',
  won: 'Úroveň 1 dokončena', summary: 'Všechny úrovně dokončeny', moves: 'Tahů',
  completed: 'Dokončené úrovně', stars: 'Získané hvězdy',
}

type Dismissal = 'close' | 'escape' | 'backdrop' | 'menu'

function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

function magnet(page: Page, id: string) {
  return page.locator(`[data-magnet="${id}"]`)
}

async function checkDialog(page: Page, labels: typeof english, name: string) {
  const dialog = page.getByRole('dialog', { name })
  const close = dialog.getByRole('button', { name: labels.close, exact: true })
  await expect(close).toBeInViewport({ ratio: 1 })
  await expect(dialog.getByRole('button', { name: labels.menu, exact: true })).toBeInViewport({ ratio: 1 })
  const bounds = await dialog.boundingBox()
  const target = await close.boundingBox()
  if (!bounds || !target) throw new Error('Dialog and close button must be visible')
  expect(target.width).toBeGreaterThanOrEqual(44)
  expect(target.height).toBeGreaterThanOrEqual(44)
  expect(target.x + target.width).toBeGreaterThanOrEqual(bounds.x + bounds.width - 26)
  expect(target.y).toBeLessThanOrEqual(bounds.y + 26)
}

async function checkProgress(page: Page, labels: typeof english, completed: number, stars: number) {
  const progress = page.getByRole('region', { name: 'Parcel Pull' }).locator('.title-progress')
  await expect(progress.locator('dt', { hasText: labels.completed }).locator('+ dd')).toHaveText(`${completed} / 40`)
  await expect(progress.locator('dt', { hasText: labels.stars }).locator('+ dd')).toHaveText(`★ ${stars} / 120`)
}

async function dismiss(page: Page, labels: typeof english, method: Dismissal) {
  if (method === 'escape') {
    await page.keyboard.press('Escape')
  } else if (method === 'backdrop') {
    await page.touchscreen.tap(2, 2)
  } else {
    await button(page, labels[method]).click()
  }
}

async function trackAds(page: Page) {
  await page.addInitScript(() => {
    window.__parcelTestPlatform = {
      supportsAd: (kind) => kind === 'interstitial',
      async requestAd() {
        const requests = Number(sessionStorage.getItem('test-ad-requests'))
        sessionStorage.setItem('test-ad-requests', String(requests + 1))
        return 'completed'
      },
      loadingStart() {},
      loadingStop() {},
      gameplayStart() {},
      gameplayStop() {},
      record() {},
    }
  })
}

function adRequests(page: Page) {
  return page.evaluate(() => Number(sessionStorage.getItem('test-ad-requests')))
}

const cases = [
  { locale: 'en-US', labels: english, viewport: { width: 320, height: 480 }, method: 'close' },
  { locale: 'en-US', labels: english, viewport: { width: 568, height: 320 }, method: 'escape' },
  { locale: 'cs-CZ', labels: czech, viewport: { width: 320, height: 480 }, method: 'backdrop' },
  { locale: 'cs-CZ', labels: czech, viewport: { width: 568, height: 320 }, method: 'menu' },
] as const

for (const { locale, labels, viewport, method } of cases) {
  test.describe(`${locale} ${viewport.width}×${viewport.height}`, () => {
    test.use({ locale, viewport })

    test('keeps navigation accessible on all five dialogs and closes results without ads', async ({ page }) => {
      await trackAds(page)
      await page.goto('/')
      await checkProgress(page, labels, 0, 0)
      await expect(button(page, labels.play)).toBeFocused()

      await button(page, labels.play).click()
      await magnet(page, 'W1A').click()
      await expect(page.locator('.moves')).toHaveText(`${labels.moves}: 1`)
      await button(page, labels.pause).click()
      await checkDialog(page, labels, labels.pause)
      await button(page, labels.settings).click()
      await checkDialog(page, labels, labels.settings)
      const settings = page.getByRole('dialog', { name: labels.settings })
      const settingsBounds = await settings.boundingBox()
      if (!settingsBounds) throw new Error('Settings must be visible')
      await page.mouse.click(settingsBounds.x + 8, settingsBounds.y + 8)
      await expect(settings).toBeVisible()
      await page.mouse.move(settingsBounds.x + 8, settingsBounds.y + 8)
      await page.mouse.down()
      await page.mouse.move(2, 2)
      await page.mouse.up()
      await expect(settings).toBeVisible()
      await dismiss(page, labels, 'escape')
      await expect(button(page, labels.settings)).toBeFocused()

      await button(page, labels.levels).click()
      await checkDialog(page, labels, labels.levels)
      await page.locator('[data-level="40"]').scrollIntoViewIfNeeded()
      await checkDialog(page, labels, labels.levels)
      await dismiss(page, labels, 'backdrop')
      await expect(button(page, labels.levels)).toBeFocused()
      await dismiss(page, labels, 'close')
      await expect(page.getByRole('dialog')).toBeHidden()

      await button(page, labels.pause).click()
      await dismiss(page, labels, 'menu')
      await expect(button(page, labels.continue)).toBeFocused()
      await button(page, labels.continue).click()
      await expect(page.locator('.moves')).toHaveText(`${labels.moves}: 1`)
      await button(page, labels.undo).click()
      await expect(page.locator('.moves')).toHaveText(`${labels.moves}: 0`)
      for (let move = 0; move < 2; move++) await magnet(page, 'W1A').click()
      await checkDialog(page, labels, labels.won)
      await dismiss(page, labels, method)
      await expect(button(page, labels.continue)).toBeFocused()
      expect(await adRequests(page)).toBe(0)

      await checkProgress(page, labels, 1, 3)

      const finalLevel = levels[levels.length - 1]
      const route = shortestRoute(finalLevel)
      if (!route) throw new Error('Expected a solution for the final level')
      const results = Object.fromEntries(levels.slice(0, -1).map(({ id, minimum }) => [id, { moves: minimum, stars: 3 }]))
      await page.evaluate((results) => {
        localStorage.setItem('parcel-pull.progress', JSON.stringify({ version: 2, sound: true, hints: 0, results }))
      }, results)
      await page.reload()
      await button(page, labels.continue).click()
      for (const move of route.moves) await magnet(page, move.magnet.id).click()
      await checkDialog(page, labels, labels.summary)
      await dismiss(page, labels, method)
      await expect(button(page, labels.continue)).toBeFocused()
      expect(await adRequests(page)).toBe(0)

      await checkProgress(page, labels, 40, 120)

      await button(page, labels.levels).click()
      await page.locator('[data-level="1"]').click()
      for (let move = 0; move < 2; move++) await magnet(page, 'W1A').click()
      await button(page, labels.next).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      expect(await adRequests(page)).toBe(1)
    })
  })
}

test('returns from settings to the same board with storage denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Storage denied', 'SecurityError') },
    })
  })
  await page.goto('/')
  await expect(page.getByText("Progress won't save")).toBeVisible()
  await button(page, 'Play').click()
  await magnet(page, 'W1A').click()
  await expect(page.locator('.moves')).toHaveText('Moves: 1')
  await button(page, 'Pause').click()
  await button(page, 'Settings').click()
  await button(page, 'Menu').click()
  await button(page, 'Continue').click()
  await expect(page.locator('.moves')).toHaveText('Moves: 1')
  await button(page, 'Undo').click()
  await expect(page.locator('.moves')).toHaveText('Moves: 0')
})
