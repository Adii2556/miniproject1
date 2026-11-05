import { expect, type Page, type Route } from '@playwright/test'

export const GROQ_URL = 'https://api.groq.com/**'

export type GroqRequestBody = {
  temperature: number
  messages: Array<{ role: string; content: string }>
}

export const groqResult = (content: unknown) => ({
  choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
})

export async function fulfillGroq(route: Route, content: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(status === 200 ? groqResult(content) : content),
  })
}

export async function addApiKey(page: Page, key = 'browser-test-key') {
  const keyInput = page.locator('#groq-key')
  if (!(await keyInput.isVisible())) await page.getByRole('button', { name: 'Open settings' }).click()
  await keyInput.fill(key)
  const close = page.getByRole('button', { name: 'Close settings' })
  // On narrow viewports the virtual-keyboard scroll position can move the
  // header outside the visual viewport. Escape exercises the same close path.
  if (await close.isVisible()) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(350)
  }
}

export async function uploadText(page: Page, text: string, name = 'evidence.txt') {
  await page.locator('input[type="file"]').first().setInputFiles({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(text),
  })
  await expect(page.getByTitle(name)).toBeVisible()
}

export async function generateSummary(page: Page) {
  await page.getByRole('button', { name: 'Summary only' }).click()
  await page.getByRole('button', { name: 'Generate analysis' }).click()
}

export function directSummary(sourceId: string, excerpt: string) {
  return {
    title: 'Evidence-backed result',
    oneLiner: 'Every claim links to the uploaded source.',
    summary: {
      text: 'The document provides directly verifiable evidence.',
      citations: [{ sourceId, excerpt }],
    },
  }
}
