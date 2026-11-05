import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { SourceBlock } from './document'

// Vite turns `?url` into a browser asset URL. Vitest runs PDF.js in Node, where
// that URL would otherwise be resolved from the drive root rather than this repo.
pdfjsLib.GlobalWorkerOptions.workerSrc = typeof window === 'undefined'
  ? new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href
  : pdfWorkerUrl as string

export const MAX_PDF_PAGES = 200
export const MAX_EXTRACTED_CHARS = 250_000
export const PDF_PROCESSING_TIMEOUT_MS = 30_000
const MAX_IMAGE_PIXELS = 16_000_000

export interface PdfExtractResult {
  text: string
  blocks: SourceBlock[]
  pageCount: number
  firstPageDataUrl: string | null
}

type PdfValidationCode = 'INVALID_SIGNATURE' | 'TOO_MANY_PAGES' | 'TOO_MUCH_TEXT' | 'TIMEOUT'

export class PdfValidationError extends Error {
  constructor(
    message: string,
    public readonly code: PdfValidationCode,
  ) {
    super(message)
    this.name = 'PdfValidationError'
  }
}

export function hasPdfSignature(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false
  const bytes = new Uint8Array(buffer, 0, 5)
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

/** Extract bounded text and a first-page thumbnail from a local PDF. */
export async function extractPdf(buffer: ArrayBuffer): Promise<PdfExtractResult> {
  if (!hasPdfSignature(buffer)) {
    throw new PdfValidationError('The file does not have a valid PDF signature.', 'INVALID_SIGNATURE')
  }

  const task = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    // PDF.js 6 removed the legacy isEvalSupported loader option after fixing
    // its evaluator. This extractor never creates an annotation/scripting layer.
    enableXfa: false,
    maxImageSize: MAX_IMAGE_PIXELS,
    stopAtErrors: true,
  })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      void task.destroy()
      reject(new PdfValidationError('PDF processing took too long.', 'TIMEOUT'))
    }, PDF_PROCESSING_TIMEOUT_MS)
  })

  try {
    const doc = await Promise.race([task.promise, timeout])
    const pageCount = doc.numPages
    if (pageCount > MAX_PDF_PAGES) {
      throw new PdfValidationError(`PDFs are limited to ${MAX_PDF_PAGES} pages.`, 'TOO_MANY_PAGES')
    }

    const parts: string[] = []
    const blocks: SourceBlock[] = []
    let extractedChars = 0
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i)
      try {
        const content = await page.getTextContent()
        let pageText = ''
        for (const item of content.items) {
          const textItem = item as { str?: string; hasEOL?: boolean }
          if (typeof textItem.str !== 'string') continue
          const addition = textItem.str + (textItem.hasEOL ? '\n' : ' ')
          extractedChars += addition.length
          if (extractedChars > MAX_EXTRACTED_CHARS) {
            throw new PdfValidationError(
              `PDF text is limited to ${MAX_EXTRACTED_CHARS.toLocaleString()} characters.`,
              'TOO_MUCH_TEXT',
            )
          }
          pageText += addition
        }
        const normalized = pageText.replace(/[ \t]+/g, ' ').trim()
        parts.push(normalized)
        blocks.push({ id: `p${i}`, label: `Page ${i}`, pageNumber: i, text: normalized })
      } finally {
        page.cleanup()
      }
    }

    let firstPageDataUrl: string | null = null
    try {
      const page = await doc.getPage(1)
      try {
        const base = page.getViewport({ scale: 1 })
        const scale = Math.min(1.6, 620 / base.width)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))
        const ctx = canvas.getContext('2d')
        if (ctx) {
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
          firstPageDataUrl = canvas.toDataURL('image/jpeg', 0.82)
        }
      } finally {
        page.cleanup()
      }
    } catch {
      firstPageDataUrl = null
    }

    return { text: parts.join('\n\n'), blocks, pageCount, firstPageDataUrl }
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    await task.destroy().catch(() => undefined)
  }
}
