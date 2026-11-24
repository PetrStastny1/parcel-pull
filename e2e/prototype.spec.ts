import { expect, test } from './fixtures.ts'
import type { Page } from '@playwright/test'

const routes = [
  'W1A W1A',
  'W1 S1A S1A',
  'E3B N3A N3A N3A E3B E3B',
  'W1 S2A E1 S2A S2A E3B E3B',
  'W2 N1A W2 N1A E1B E1B E1B E1B',
  'E1B W3 N1 N1 E1B N3A E1B E1B E1B',
  'N4 E1 S3 S3 W3 W3 N1A N1A W3 N1A W2B',
  'N1 E1 S2A S2A W1 S2A S2A E3B E3B E3B',
  'W3 N1A N1A N1A E1 E1 S3 S3 W3 S2B S2B',
  'S4 S4 W4 W4 N1A W4 N1A N1A E2 N2B N2B W1C',
  'S3 E3 E3 W4B S3 W4B N1A S3 W4B W4B N1A N1A N1A W1C',
  'W2 W2 N1C N1C E1 N3A E1 E1 S4 S4 S4 W4B W4B W4B W4B',
  'N1C W1 W1 W1 N1C E1B N1C E1B E1B E1B S5 E1B E1B N5 W1 W1 W1 W1 S1A S1A S1A S1A',
  'N1C W4 W4 W4 W4 N1C N1C E1 N1C N1C W1 S1A W1 S1A S1A E4B E4B E4B E4B E4B S1A S1A',
  'N2A N2A N2A E1 S5 E1 S5 E1 S5 W4C S5 W4C S5 W4C W4C N2A N2A N2A N2A S3B W4C',
]

test.use({ locale: 'en-US', reducedMotion: 'reduce' })

function magnet(page: Page, id: string) {
  return page.locator(`button[data-magnet="${id}"]`)
}

function action(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

function moves(page: Page, count: number) {
  return page.getByText(`Moves: ${count}`, { exact: true }).first()
}

async function pull(page: Page, route: string) {
  for (const id of route.split(' ')) await magnet(page, id).click()
}

async function start(page: Page) {
  await page.goto('/')
  await action(page, 'Play').click()
}

async function checkFit(page: Page) {
  await expect(page.locator('.board')).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > innerWidth,
    vertical: document.documentElement.scrollHeight > innerHeight,
  }))).toEqual({ horizontal: false, vertical: false })

  for (const button of await page.getByRole('button').all()) {
    const bounds = await button.boundingBox()
    expect(bounds?.width).toBeGreaterThanOrEqual(44)
    expect(bounds?.height).toBeGreaterThanOrEqual(44)
  }
}

test('plays all fifteen solutions and persists completion and stars', async ({ page }) => {
  await start(page)
  for (const [index, route] of routes.entries()) {
    await expect(moves(page, 0)).toBeVisible()
    if (index === 5) {
      await expect(page.getByRole('group', { name: 'Board' })).toHaveAccessibleDescription(
        '4 columns, 3 rows. Wall at column 2, row 2.',
      )
    }
    await pull(page, route)

    const lastLevel = index === routes.length - 1
    const result = lastLevel ? 'All levels complete' : `Level ${index + 1} complete`
    await expect(page.getByRole('heading', { name: result, exact: true })).toBeVisible()
    if (index === 11) {
      await expect(action(page, 'Next level')).toBeVisible()
      await page.reload()
      await action(page, 'Continue').click()
      await expect(page.locator('.level-label')).toHaveText('Level 13')
    } else if (!lastLevel) {
      await action(page, 'Next level').click()
    }
  }
  await expect(action(page, 'Replay')).toBeVisible()
  await expect(action(page, 'Next level')).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Stars: 45' })).toBeVisible()
  await action(page, 'Levels').click()
  await action(page, 'Back').click()
  await expect(page.getByRole('heading', { name: 'All levels complete' })).toBeVisible()

  await page.reload()
  await action(page, 'Levels').click()
  for (let level = 1; level <= routes.length; level += 1) {
    await expect(action(page, `Level ${level}, stars: 3`)).toBeEnabled()
  }
  await expect(page.locator('button[data-level]')).toHaveCount(15)
})

test('returns to the same victory after closing the level picker', async ({ page }) => {
  await start(page)
  await pull(page, routes[0])
  const victory = page.getByRole('heading', { name: 'Level 1 complete' })
  const picker = action(page, 'Levels')

  await picker.click()
  await action(page, 'Back').click()
  await expect(victory).toBeVisible()
  await expect(picker).toBeFocused()
  await expect(moves(page, 2)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Stars: 3' })).toBeVisible()

  await picker.click()
  await page.keyboard.press('Escape')
  await expect(victory).toBeVisible()
  await expect(picker).toBeFocused()

  await picker.click()
  await action(page, 'Level 1, stars: 3').click()
  await expect(victory).toBeHidden()
  await expect(moves(page, 0)).toBeVisible()
  await pull(page, routes[0])
  await expect(victory).toBeVisible()
})

test('unlocks the next level and starts it through the level picker', async ({ page }) => {
  await start(page)
  await action(page, 'Pause').click()
  await action(page, 'Levels').click()
  await expect(action(page, 'Level 2, locked')).toBeDisabled()
  await action(page, 'Back').click()
  await expect(action(page, 'Resume')).toBeVisible()
  await expect(action(page, 'Levels')).toBeFocused()
  await action(page, 'Levels').click()
  await action(page, 'Level 1, stars: 0').click()
  await pull(page, routes[0])
  await action(page, 'Levels').click()
  await action(page, 'Level 2, stars: 0').click()
  await expect(magnet(page, 'S1A')).toBeVisible()
  await expect(moves(page, 0)).toBeVisible()
})

test('restores the third board, detects the blocked route, and accepts Undo and Restart', async ({ page }) => {
  await start(page)
  for (const route of routes.slice(0, 2)) {
    await pull(page, route)
    await action(page, 'Next level').click()
  }

  await pull(page, 'E3B')
  const parcelA = page.locator('.parcel[data-parcel="A"]')
  const parcelB = page.locator('.parcel[data-parcel="B"]')
  await expect(parcelA).toHaveCSS('--column', '3')
  await expect(parcelB).toHaveCSS('--column', '2')
  await expect(moves(page, 1)).toBeVisible()

  await page.reload()
  await action(page, 'Continue').click()
  await expect(parcelA).toHaveCSS('--column', '3')
  await expect(parcelB).toHaveCSS('--column', '2')
  await expect(moves(page, 1)).toBeVisible()
  await expect(action(page, 'Undo')).toBeEnabled()

  await pull(page, 'N2')
  const blocked = page.getByRole('heading', { name: 'Route blocked' })
  await expect(blocked).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(blocked).toBeVisible()
  await action(page, 'Levels').click()
  await action(page, 'Back').click()
  await expect(blocked).toBeVisible()
  await expect(action(page, 'Levels')).toBeFocused()
  await page.getByRole('dialog').getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(blocked).toBeHidden()
  await expect(parcelB).toHaveCSS('--row', '3')
  await expect(moves(page, 1)).toBeVisible()

  await action(page, 'Undo').click()
  await expect(moves(page, 0)).toBeVisible()
  await expect(parcelA).toHaveCSS('--column', '2')
  await expect(parcelB).toHaveCSS('--column', '1')
  await expect(action(page, 'Undo')).toBeDisabled()

  await pull(page, 'E3B')
  await action(page, 'Restart').click()
  await expect(moves(page, 0)).toBeVisible()
  await expect(action(page, 'Undo')).toBeDisabled()
})

for (const viewport of [{ width: 320, height: 480 }, { width: 568, height: 320 }]) {
  test(`fits all controls and plays level one at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await start(page)
    await checkFit(page)
    await pull(page, routes[0])
    await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  })
}

test('completes level one with the keyboard and visible focus', async ({ page }) => {
  await page.goto('/')
  await action(page, 'Play').press('Enter')

  const dock = magnet(page, 'W1A')
  await expect(dock).toBeFocused()
  await expect(dock).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(moves(page, 1)).toBeVisible()
  await page.keyboard.press('z')
  await expect(moves(page, 0)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(moves(page, 1)).toBeVisible()
  await page.keyboard.press('r')
  await expect(moves(page, 0)).toBeVisible()

  await page.keyboard.down('Escape')
  await expect(action(page, 'Resume')).toBeVisible()
  await page.keyboard.down('Escape')
  await expect(action(page, 'Resume')).toBeVisible()
  await page.keyboard.up('Escape')
  await page.keyboard.press('Escape')
  await expect(action(page, 'Resume')).toBeHidden()
  await expect(dock).toBeFocused()

  await page.keyboard.press('Space')
  await expect(moves(page, 1)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
})

test.describe('touch input', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 480 } })

  test('discards a touch ending outside the magnet and accepts a tap', async ({ page }) => {
    await start(page)
    const dock = magnet(page, 'W1A')
    const bounds = await dock.boundingBox()
    expect(bounds).not.toBeNull()
    if (!bounds) throw new Error('Dock is outside the viewport')

    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    const input = await page.context().newCDPSession(page)
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + bounds.width + 4, y }],
    })
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(moves(page, 0)).toBeVisible()

    await dock.tap()
    await expect(moves(page, 1)).toBeVisible()
    await dock.tap()
    await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  })
})

test.describe('animated input', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('discards a second mouse activation during the move', async ({ page }) => {
    await start(page)
    const dock = magnet(page, 'W1A')
    await dock.dblclick()
    await expect(moves(page, 1)).toBeVisible()
    await expect.poll(() => dock.evaluate((button) => button.getAnimations().some(
      (animation) => animation.effect?.getTiming().duration === 160,
    ))).toBe(false)
    await dock.click()
    await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  })
})

test.describe('Czech compact layout', () => {
  test.use({ locale: 'cs-CZ' })

  test('fits Czech actions on the first and largest boards at both minimum sizes', async ({ page }) => {
    const viewports = [{ width: 320, height: 480 }, { width: 568, height: 320 }]
    await page.setViewportSize(viewports[0])
    await page.goto('/')
    await action(page, 'Hrát').click()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await checkFit(page)
    }
    for (const route of routes.slice(0, 11)) {
      await pull(page, route)
      await action(page, 'Další úroveň').click()
    }
    await expect(page.locator('.level-label')).toHaveText('Úroveň 12')
    for (const viewport of [...viewports, { width: 568, height: 521 }, { width: 620, height: 540 }]) {
      await page.setViewportSize(viewport)
      await checkFit(page)
      const stage = await page.locator('.stage').boundingBox()
      const board = await page.locator('.board').boundingBox()
      expect(stage).not.toBeNull()
      expect(board).not.toBeNull()
      if (stage && board) expect(board.x + board.width).toBeLessThanOrEqual(stage.x + stage.width)
      if (viewport.width > viewport.height) {
        const controls = await page.locator('.controls').boundingBox()
        expect(controls?.x).toBeGreaterThan(stage?.x ?? 0)
      }
    }
  })
})
