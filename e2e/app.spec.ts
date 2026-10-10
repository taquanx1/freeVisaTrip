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

test('opens a population-sorted country list, closes it outside, and zooms the map', async ({ page }) => {
  await page.route('**/api/visa-map?*', async (route) => route.fulfill({ json: {
    destinations: [{
      countryCode: 'TH', country: 'Thailand', eligible: true, pattern: ['visa-free'],
      policies: [{ passport: 'SG', kind: 'visa-free', label: 'Visa-free', raw: 'visa free' }],
      airports: [
        { iata: 'HKT', name: 'Phuket International Airport', municipality: 'Phuket', countryCode: 'TH', country: 'Thailand', lat: 8.1132, lon: 98.3169, population: 89072 },
        { iata: 'BKK', name: 'Suvarnabhumi Airport', municipality: 'Bangkok', countryCode: 'TH', country: 'Thailand', lat: 13.6811, lon: 100.7472, population: 5104476 },
      ],
    }],
    freshness: { refreshedAt: '2026-10-10T00:00:00Z', revision: 'test', stale: false, source: 'test' },
  } }))
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Search passports' }).fill('Singapore')
  await page.getByRole('option').click()
  await page.getByRole('button', { name: /See destinations/i }).click()

  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
  await page.getByRole('button', { name: 'Reset map zoom' }).click()

  await page.getByRole('button', { name: 'Thailand, eligible' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Thailand' })).toBeVisible()
  const cityHeadings = page.locator('.city-heading strong')
  await expect(cityHeadings).toHaveText(['Bangkok', 'Phuket'])
  await expect(page.locator('.rsm-marker')).toHaveCount(0)

  await page.getByRole('heading', { name: 'Where can everyone go?' }).click()
  await expect(page.getByRole('heading', { name: 'Thailand' })).toHaveCount(0)
})
