import { expect, test } from '@playwright/test'

test('supports the passport selection journey', async ({ page }) => {
  await page.route('**/api/visa-map?*', async (route) => route.fulfill({ json: { destinations: [], freshness: { refreshedAt: '2026-10-10T00:00:00Z', revision: 'test', stale: false, source: 'test' } } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /One world/i })).toBeVisible()
  await page.getByRole('combobox', { name: 'Search passports' }).fill('Singapore')
  await page.getByRole('option').click()
  await expect(page.getByRole('button', { name: 'Remove Singapore' })).toBeVisible()
  await page.getByRole('button', { name: /See destinations/i }).click()
  await expect(page.getByRole('heading', { name: 'Where can everyone go?' })).toBeVisible()
})

test('honours reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto')
})
