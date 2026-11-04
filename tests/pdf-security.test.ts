import { describe, expect, test } from 'vitest'
import { hasPdfSignature } from '../src/lib/pdfExtract'

describe('PDF signature validation', () => {
  test('accepts the PDF magic header', () => {
    expect(hasPdfSignature(new TextEncoder().encode('%PDF-1.7').buffer)).toBe(true)
  })

  test('rejects renamed or truncated non-PDF files', () => {
    expect(hasPdfSignature(new TextEncoder().encode('not a pdf').buffer)).toBe(false)
    expect(hasPdfSignature(new Uint8Array([0x25, 0x50]).buffer)).toBe(false)
  })
})
