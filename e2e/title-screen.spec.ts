import type { Page } from '@playwright/test'
import cs from '../src/i18n/cs.json' with { type: 'json' }
import en from '../src/i18n/en.json' with { type: 'json' }
import { expect, test } from './fixtures.ts'

function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

function titleScreen(page: Page) {
  return page.getByRole('region', { name: en.title })
}

function progressValue(page: Page, label: string) {
  return titleScreen(page).locator('dt', { hasText: label }).locator('+ dd')
}

const sizes = [{ width: 320, height: 480 }, { width: 568, height: 320 }]
const locales = [{ locale: 'en-US', copy: en }, { locale: 'cs-CZ', copy: cs }] as const

for (const { locale, copy } of locales) {
  for (const viewport of sizes) {
    test.describe(`${locale} ${viewport.width}×${viewport.height}`, () => {
      test.use({ locale, viewport, reducedMotion: 'reduce' })

      test('fills the screen with the logo, progress and large actions', async ({ page }) => {
        await page.goto('/')
        const title = titleScreen(page)
        await expect(title.getByRole('heading', { level: 1, name: copy.title })).toBeVisible()
        await expect(button(page, copy.play)).toBeFocused()
        await expect(page.locator('.game')).toBeHidden()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(progressValue(page, copy.completedLevels)).toHaveText('0 / 40')
        await expect(progressValue(page, copy.earnedStars)).toHaveText('★ 0 / 120')

        const actions = await title.getByRole('button').allTextContents()
        expect(actions).toEqual([copy.play, copy.levels, copy.settings])
        const play = await button(page, copy.play).boundingBox()
        const levels = await button(page, copy.levels).boundingBox()
        const settings = await button(page, copy.settings).boundingBox()
        if (!play || !levels || !settings) throw new Error('Title actions must be visible')
        expect(play.height).toBeGreaterThan(levels.height)
        expect(play.width).toBeGreaterThan(levels.width)
        expect(levels.y).toBeGreaterThanOrEqual(play.y + play.height)
        expect(settings.y).toBe(levels.y)
        for (const bounds of [play, levels, settings]) {
          expect(bounds.width).toBeGreaterThanOrEqual(44)
          expect(bounds.height).toBeGreaterThanOrEqual(44)
        }

        for (const part of [title.locator('.title-scene'), title.getByRole('heading'), title.locator('.title-progress')]) {
          await expect(part).toBeInViewport({ ratio: 1 })
        }
        expect(await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > innerWidth,
          vertical: document.documentElement.scrollHeight > innerHeight,
        }))).toEqual({ horizontal: false, vertical: false })
      })
    })
  }
}

test.describe('saved progress', () => {
  test.use({ locale: 'en-US', reducedMotion: 'reduce' })

  test('offers Continue with the earned stars and completed levels', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('parcel-pull.progress', JSON.stringify({
        version: 2, sound: true, hints: 0, results: { 1: { moves: 2, stars: 3 }, 2: { moves: 4, stars: 2 } },
      }))
    })
    await page.goto('/')
    await expect(button(page, en.continue)).toBeFocused()
    await expect(button(page, en.play)).toHaveCount(0)
    await expect(progressValue(page, en.completedLevels)).toHaveText('2 / 40')
    await expect(progressValue(page, en.earnedStars)).toHaveText('★ 5 / 120')

    await button(page, en.continue).click()
    await expect(page.locator('.level-label')).toHaveText('Level 3')
    await expect(titleScreen(page)).toBeHidden()
  })
})

test.describe('title navigation', () => {
  test.use({ locale: 'en-US', reducedMotion: 'reduce' })

  test('opens settings and levels over the title and returns focus', async ({ page }) => {
    await page.goto('/')
    await button(page, en.settings).click()
    const settings = page.getByRole('dialog', { name: en.settings })
    await expect(settings).toBeVisible()
    await settings.getByRole('combobox').selectOption('cs')
    await expect(titleScreen(page).getByRole('button', { name: cs.play, exact: true })).toBeAttached()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(button(page, cs.settings)).toBeFocused()

    await button(page, cs.levels).click()
    await expect(page.getByRole('dialog', { name: cs.levels })).toBeVisible()
    await button(page, cs.back).click()
    await expect(button(page, cs.levels)).toBeFocused()

    await button(page, cs.levels).click()
    await page.locator('[data-level="1"]').click()
    await expect(titleScreen(page)).toBeHidden()
    await expect(page.locator('[data-magnet="W1A"]')).toBeVisible()

    await button(page, cs.pause).click()
    await button(page, cs.menu).click()
    await expect(titleScreen(page)).toBeVisible()
    await expect(page.locator('.game')).toBeHidden()
    await expect(button(page, cs.continue)).toBeFocused()
  })
})

test.describe('scene motion', () => {
  test('loops the magnet pull and stays still with reduced motion', async ({ browser }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({ reducedMotion, locale: 'en-US' })
      const page = await context.newPage()
      await page.goto('/')
      await expect(button(page, en.play)).toBeVisible()
      const animations = await page.locator('.title-scene').evaluate((scene) =>
        scene.getAnimations({ subtree: true }).map((animation) => animation.effect?.getComputedTiming().iterations))
      if (reducedMotion === 'reduce') expect(animations).toEqual([])
      else expect(animations.length > 0 && animations.every((iterations) => iterations === Infinity)).toBe(true)
      await context.close()
    }
  })
})
