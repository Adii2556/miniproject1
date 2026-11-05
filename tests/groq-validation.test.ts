import { afterEach, describe, expect, test, vi } from 'vitest'
import { callGroq, FriendlyError, type AnalysisSettings } from '../src/lib/groq'
import { createTextDocument } from '../src/lib/document'

const settings: AnalysisSettings = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.2,
  maxTokens: 512,
  summaryStyle: 'concise',
  language: 'English',
  readingLevel: 'professional',
}

const document = createTextDocument('Verified evidence establishes the central finding.', 'evidence.txt')
const valid = {
  title: 'Verified finding',
  oneLiner: 'A source-backed result.',
  summary: {
    text: 'The document states a central finding.',
    citations: [{ sourceId: 'para-1', excerpt: 'Verified evidence establishes the central finding.' }],
  },
}

const response = (content: string | object, status = 200) => new Response(
  status === 200
    ? JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] })
    : JSON.stringify(content),
  { status, headers: { 'Content-Type': 'application/json' } },
)

afterEach(() => vi.unstubAllGlobals())

describe('Groq validation and retry policy', () => {
  test('retries one malformed response at temperature zero', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.resolve(response('not-json')))
      .mockImplementationOnce(() => Promise.resolve(response(valid)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await callGroq('gsk_test', settings, ['summary'], document)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)) as { temperature: number; messages: Array<{ content: string }> }
    expect(retryBody.temperature).toBe(0)
    expect(retryBody.messages.at(-1)?.content).toContain('failed validation')
    expect(result.summary?.citations).toHaveLength(1)
  })

  test('stops safely after exactly two invalid responses', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response('still-not-json')))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGroq('gsk_test', settings, ['summary'], document)).rejects.toMatchObject({ code: 'UNVERIFIED' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test.each([
    [401, 'AUTH'],
    [403, 'AUTH'],
    [429, 'RATE_LIMIT'],
    [503, 'SERVER'],
  ] as const)('does not retry HTTP %s responses', async (status, code) => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response({ error: { message: 'rejected' } }, status)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGroq('gsk_test', settings, ['summary'], document)).rejects.toMatchObject({ code })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('does not retry ordinary network failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('connection failed'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGroq('gsk_test', settings, ['summary'], document)).rejects.toMatchObject({ code: 'NETWORK' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('omits unsupported key points while retaining verified claims', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(response({
      ...valid,
      keyPoints: [
        { text: 'Supported point.', citations: [{ sourceId: 'para-1', excerpt: 'central finding' }] },
        { text: 'Invented point.', citations: [{ sourceId: 'para-1', excerpt: 'not in the document' }] },
      ],
    }))))

    const result = await callGroq('gsk_test', settings, ['summary', 'keyPoints'], document)
    expect(result.keyPoints).toHaveLength(1)
    expect(result.keyPoints?.[0].text).toBe('Supported point.')
  })

  test('propagates cancellation instead of retrying it', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const pending = callGroq('gsk_test', settings, ['summary'], document, controller.signal)
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('exposes typed friendly failures', () => {
    expect(new FriendlyError('No evidence', 'UNVERIFIED')).toMatchObject({ code: 'UNVERIFIED' })
  })
})
