import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

export const test = process.env.PARCEL_TEST_SINGLE_PROCESS
  ? base.extend({
    context: async ({
      playwright, baseURL, viewport, locale, colorScheme, reducedMotion, hasTouch,
      isMobile, deviceScaleFactor, userAgent, contextOptions,
    }, use) => {
      const browser = await playwright.chromium.launch({ args: ['--single-process'] })
      try {
        const context = await browser.newContext({
          ...contextOptions, baseURL, viewport, locale, colorScheme, reducedMotion,
          hasTouch, isMobile, deviceScaleFactor, userAgent,
        })
        await use(context)
      } finally {
        await browser.close()
      }
    },
  })
  : base
