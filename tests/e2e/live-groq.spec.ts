import { expect, test } from '@playwright/test'
import { addApiKey, generateSummary, uploadText } from './helpers'

const deploymentUrl = process.env.DEPLOYMENT_URL?.replace(/\/$/, '')
const liveKey = process.env.GROQ_API_KEY
const enabled = process.env.LIVE_GROQ === '1' && Boolean(deploymentUrl && liveKey)

test.describe('manual live Groq smoke', () => {
  test.skip(!enabled, 'Set LIVE_GROQ=1, DEPLOYMENT_URL and GROQ_API_KEY for the opt-in live smoke test')

  test('analyzes one small fixture with a verifiable citation', async ({ page }) => {
    await page.goto(`${deploymentUrl}/#/app`)
    await addApiKey(page, liveKey)
    await uploadText(page, 'The staging release is ready for review on Friday.', 'live-smoke.txt')
    await generateSummary(page)

    await expect(page.getByLabel('Analysis coverage')).toContainText('Analyzed the full document', { timeout: 60_000 })
    await expect(page.getByRole('button', { name: /Open supporting source Paragraph 1/ }).first()).toBeVisible()
  })
})
