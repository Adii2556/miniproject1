import { describe, expect, test } from 'vitest'
import { extractPdf, hasPdfSignature } from '../src/lib/pdfExtract'
import { createTestPdf } from './fixtures/pdf'

describe('PDF signature validation', () => {
  test('accepts the PDF magic header', () => {
    expect(hasPdfSignature(new TextEncoder().encode('%PDF-1.7').buffer)).toBe(true)
  })

  test('rejects renamed or truncated non-PDF files', () => {
    expect(hasPdfSignature(new TextEncoder().encode('not a pdf').buffer)).toBe(false)
    expect(hasPdfSignature(new Uint8Array([0x25, 0x50]).buffer)).toBe(false)
  })

  test('preserves page-aware source blocks', async () => {
    const bytes = createTestPdf(['First page evidence', 'Second page conclusion'])
    const result = await extractPdf(bytes.buffer as ArrayBuffer)

    expect(result.pageCount).toBe(2)
    expect(result.blocks).toMatchObject([
      { id: 'p1', label: 'Page 1', pageNumber: 1 },
      { id: 'p2', label: 'Page 2', pageNumber: 2 },
    ])
    expect(result.blocks[0].text).toContain('First page evidence')
    expect(result.blocks[1].text).toContain('Second page conclusion')
  })

  test('rejects structurally malformed PDFs after signature validation', async () => {
    const malformed = new TextEncoder().encode('%PDF-1.4\nthis is not a complete PDF')
    await expect(extractPdf(malformed.buffer)).rejects.toBeInstanceOf(Error)
  })

  test('rejects PDFs above the page-count limit before text extraction', async () => {
    const bytes = createTestPdf(Array.from({ length: 201 }, (_, index) => `Page ${index + 1}`))
    await expect(extractPdf(bytes.buffer as ArrayBuffer)).rejects.toMatchObject({ code: 'TOO_MANY_PAGES' })
  })

})
