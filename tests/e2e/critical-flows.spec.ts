import { expect, test } from '@playwright/test'
import { createTestPdf } from '../fixtures/pdf'
import { addApiKey, directSummary, fulfillGroq, generateSummary, GROQ_URL, type GroqRequestBody, uploadText } from './helpers'

test.describe('citation-first critical flows', () => {
  test('PDF citations navigate to the exact page and secrets stay out of storage', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    const key = 'browser-test-key'
    await page.route(GROQ_URL, route => fulfillGroq(route, directSummary('p1', 'First page evidence')))
    await page.goto('/#/app')
    await addApiKey(page, key)

    const pdf = createTestPdf(['First page evidence supports the finding.', 'Second page conclusion.'])
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'page-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdf),
    })
    await expect(page.getByTitle('page-evidence.pdf')).toBeVisible()
    await generateSummary(page)

    await expect(page.getByLabel('Analysis coverage')).toContainText('Analyzed the full document')
    const citation = page.getByRole('button', { name: 'Open supporting source Page 1' }).first()
    await expect(citation).toBeVisible()
    await citation.click()
    const reader = page.getByRole('dialog', { name: 'Full document text' })
    await expect(reader).toContainText('Showing evidence from Page 1')
    await expect(reader.locator('[data-source-id="p1"] mark.rounded')).toHaveText('First page evidence')

    const stored = await page.evaluate(async () => {
      const local = Object.entries(localStorage)
      const session = Object.entries(sessionStorage)
      const databases = indexedDB.databases ? await indexedDB.databases() : []
      return JSON.stringify({ local, session, databases: databases.map(database => database.name) })
    })
    expect(stored).not.toContain(key)
    expect(stored).not.toContain('First page evidence')
    expect(consoleErrors).toEqual([])
  })

  test('invalid JSON is corrected once, then rendered with a verified citation', async ({ page }) => {
    let calls = 0
    await page.route(GROQ_URL, async route => {
      calls += 1
      const body = route.request().postDataJSON() as GroqRequestBody
      if (calls === 1) return fulfillGroq(route, 'not-json')
      expect(body.temperature).toBe(0)
      expect(body.messages.at(-1)?.content).toContain('failed validation')
      return fulfillGroq(route, directSummary('para-1', 'Correctable source evidence'))
    })
    await page.goto('/#/app')
    await addApiKey(page)
    await uploadText(page, 'Correctable source evidence is present.')
    await generateSummary(page)

    await expect(page.getByRole('heading', { name: 'Evidence-backed result' })).toBeVisible()
    expect(calls).toBe(2)
  })

  test('two invalid responses produce a safe evidence error', async ({ page }) => {
    let calls = 0
    await page.route(GROQ_URL, route => { calls += 1; return fulfillGroq(route, 'not-json') })
    await page.goto('/#/app')
    await addApiKey(page)
    await uploadText(page, 'Evidence that must not produce an unsupported result.')
    await generateSummary(page)

    await expect(page.getByRole('alert')).toContainText('verifiable source citations')
    expect(calls).toBe(2)
  })

  test('chat retrieves one bounded source and opens its citation', async ({ page }) => {
    await page.route(GROQ_URL, route => fulfillGroq(route, {
      text: 'The deadline is Friday.',
      citations: [{ sourceId: 'para-2', excerpt: 'The delivery deadline is Friday.' }],
    }))
    await page.goto('/#/app')
    await addApiKey(page)
    await uploadText(page, 'Project overview.\n\nThe delivery deadline is Friday.\n\nUnrelated appendix.')
    await page.getByLabel('Ask a question about the document').fill('When is the deadline?')
    await page.getByRole('button', { name: 'Send question' }).click()

    await expect(page.getByText('The deadline is Friday.')).toBeVisible()
    await page.getByRole('button', { name: 'Open supporting source Paragraph 2' }).click()
    const reader = page.getByRole('dialog', { name: 'Full document text' })
    await expect(reader.locator('[data-source-id="para-2"] mark.rounded')).toHaveText('The delivery deadline is Friday.')
  })
})
