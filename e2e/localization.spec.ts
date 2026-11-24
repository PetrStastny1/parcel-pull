import { expect, test } from './fixtures.ts'

const samples = [
  { label: 'Czech locale', locale: 'cs-CZ', lang: 'cs', play: 'Hrát' },
  { label: 'English locale', locale: 'en-GB', lang: 'en', play: 'Play' },
  { label: 'unsupported locale', locale: 'fr-FR', lang: 'en', play: 'Play' },
] as const

for (const sample of samples) {
  test.describe(sample.label, () => {
    test.use({ locale: sample.locale })

    test(`selects the language for a ${sample.label}`, async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('lang', sample.lang)
      await expect(page.getByRole('button', { name: sample.play })).toBeVisible()
    })
  })
}

test('skips unsupported preferences in order and applies a saved override', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { value: ['fr-FR', 'cs-CZ', 'en-US'] })
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Hrát' })).toBeVisible()
  await page.getByRole('button', { name: 'Nastavení' }).click()
  await page.getByLabel('Jazyk').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Play' }).click()
  await page.locator('[data-magnet="W1A"]').click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Language').selectOption('cs')
  await expect(page.getByRole('heading', { name: 'Nastavení' })).toBeVisible()
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await page.getByRole('button', { name: 'Pokračovat ve hře' }).click()
  await expect(page.locator('.moves')).toHaveText('Tahů: 1')
  await page.getByRole('button', { name: 'Zpět o tah' }).click()
  await expect(page.locator('.moves')).toHaveText('Tahů: 0')
  await page.getByRole('button', { name: 'Pauza' }).click()
  await page.getByRole('button', { name: 'Nastavení' }).click()
  await page.getByLabel('Jazyk').selectOption('en')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
})

test('uses settings in memory when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage is blocked', 'SecurityError') } })
  })
  await page.goto('/')
  await expect(page.getByText("Progress won't save")).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Language').selectOption('cs')
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page.getByText('Postup se neuloží')).toBeVisible()
  await page.getByRole('button', { name: 'Hrát' }).click()
  await page.locator('[data-magnet="W1A"]').click()
  await expect(page.locator('.moves')).toHaveText('Tahů: 1')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('a setting changed in another tab preserves completed levels', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const settingsTab = await context.newPage()
  await settingsTab.goto('/')
  await page.bringToFront()
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const dock = page.locator('[data-magnet="W1A"]')
  await dock.click()
  await dock.click()
  await expect(page.getByRole('heading', { name: 'Level 1 complete' })).toBeVisible()
  await settingsTab.bringToFront()
  await settingsTab.getByRole('button', { name: 'Settings' }).click()
  await settingsTab.getByLabel('Language').selectOption('cs')
  await settingsTab.reload()
  await settingsTab.getByRole('button', { name: 'Úrovně' }).click()
  await expect(settingsTab.getByRole('button', { name: 'Úroveň 1, počet hvězd: 3' })).toBeEnabled()
  await expect(settingsTab.getByRole('button', { name: 'Úroveň 2, počet hvězd: 0' })).toBeEnabled()
})
