import { expect, test } from '@playwright/test'
import { addApiKey, fulfillGroq, generateSummary, GROQ_URL, type GroqRequestBody, uploadText } from './helpers'

const longDocument = Array.from({ length: 24 }, (_, index) =>
  `Section ${index + 1} evidence marker. ${`Detailed source material ${index + 1}. `.repeat(190)}`,
).join('\n\n')

test.describe('bounded long-document analysis', () => {
  test('samples six chunks, discloses coverage, and stays below seven requests', async ({ page }) => {
    let calls = 0
    await page.route(GROQ_URL, async route => {
      calls += 1
      const body = route.request().postDataJSON() as GroqRequestBody
      const system = body.messages[0]?.content ?? ''
      const user = body.messages[1]?.content ?? ''
      if (system.includes('compact evidence notes')) {
        const chunkIds = [...user.matchAll(/CHUNK (chunk-\d+)/g)].map(match => match[1])
        const sourceIds = [...user.matchAll(/SOURCE ([^\s]+) \(/g)].map(match => match[1])
        return fulfillGroq(route, {
          digests: chunkIds.map((chunkId, index) => ({
            chunkId,
            overview: `Verified notes for ${chunkId}`,
            claims: [{ text: 'A sampled section contains evidence.', citations: [{ sourceId: sourceIds[index] ?? sourceIds[0], excerpt: 'evidence marker' }] }],
            keywords: ['evidence'],
          })),
        })
      }

      const match = user.match(/"sourceId":"([^"]+)"[^}]+"excerpt":"([^"]+)"/)
      return fulfillGroq(route, {
        title: 'Sampled evidence report',
        oneLiner: 'A bounded synthesis of representative sections.',
        summary: {
          text: 'Representative sections contain source-backed evidence.',
          citations: [{ sourceId: match?.[1] ?? 'para-1', excerpt: match?.[2] ?? 'evidence marker' }],
        },
      })
    })
    await page.goto('/#/app')
    await addApiKey(page)
    await uploadText(page, longDocument, 'long-evidence.txt')
    await generateSummary(page)

    await expect(page.getByLabel('Analysis coverage')).toContainText(/Analyzed 6 of \d+ sections/)
    await expect(page.getByLabel('Analysis coverage')).toContainText('Fast analysis sampled')
    expect(calls).toBeLessThanOrEqual(7)
    expect(calls).toBeGreaterThan(1)
  })

  test('cancel aborts in-flight map requests without rendering a result', async ({ page }) => {
    await page.route(GROQ_URL, async route => {
      await new Promise(resolve => setTimeout(resolve, 2_000))
      await fulfillGroq(route, { digests: [] }).catch(() => undefined)
    })
    await page.goto('/#/app')
    await addApiKey(page)
    await uploadText(page, longDocument, 'cancel-me.txt')
    await generateSummary(page)
    const cancel = page.getByRole('button', { name: 'Cancel analysis' })
    await expect(cancel).toBeVisible()
    await cancel.click()

    await expect(page.getByRole('button', { name: 'Generate analysis' })).toBeVisible()
    await expect(page.getByLabel('Analysis coverage')).toHaveCount(0)
  })
})
