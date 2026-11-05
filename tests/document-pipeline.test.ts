import { describe, expect, test } from 'vitest'
import {
  buildCoverage,
  buildDocumentChunks,
  createPdfDocument,
  createTextDocument,
  findCitationRange,
  rankChunksForQuestion,
  selectAnalysisChunks,
  validateCitations,
} from '../src/lib/document'

describe('structured document pipeline', () => {
  test('preserves PDF page and text paragraph identities', () => {
    const pdf = createPdfDocument('paper.pdf', ['First-page evidence.', 'Second-page conclusion.'])
    const text = createTextDocument('Opening paragraph.\n\nClosing paragraph.', 'notes.txt')

    expect(pdf.blocks).toMatchObject([
      { id: 'p1', label: 'Page 1', pageNumber: 1 },
      { id: 'p2', label: 'Page 2', pageNumber: 2 },
    ])
    expect(text.blocks).toMatchObject([
      { id: 'para-1', paragraphNumber: 1 },
      { id: 'para-2', paragraphNumber: 2 },
    ])
  })

  test('builds bounded overlapping chunks and samples six deterministically', () => {
    const document = createTextDocument(Array.from({ length: 30 }, (_, index) => `Paragraph ${index + 1} ${'evidence '.repeat(80)}`).join('\n\n'), 'long.txt')
    const chunks = buildDocumentChunks(document, 2_000, 200)
    const selected = selectAnalysisChunks(chunks)
    const coverage = buildCoverage(chunks, selected)

    expect(chunks.length).toBeGreaterThan(6)
    expect(selected).toHaveLength(6)
    expect(selected[0]).toBe(chunks[0])
    expect(selected.at(-1)).toBe(chunks.at(-1))
    expect(coverage).toMatchObject({ mode: 'sampled', totalChunks: chunks.length })
  })

  test('ranks relevant chunks and includes an adjacent chunk', () => {
    const document = createTextDocument(Array.from({ length: 10 }, (_, index) => {
      const topic = index === 6 ? 'Budget forecasting and cash flow controls. ' : `General section ${index + 1}. `
      return topic + `Supporting detail ${index + 1}. `.repeat(100)
    }).join('\n\n'), 'finance.txt')
    const chunks = buildDocumentChunks(document, 4_000, 100)
    const ranked = rankChunksForQuestion(chunks, 'What does the budget forecast say?', 5)

    expect(chunks.length).toBeGreaterThan(5)
    expect(ranked.some(chunk => chunk.text.toLowerCase().includes('budget'))).toBe(true)
    expect(ranked).toHaveLength(5)
    const budgetIndex = ranked.find(chunk => chunk.text.toLowerCase().includes('budget'))!.index
    expect(ranked.some(chunk => Math.abs(chunk.index - budgetIndex) === 1)).toBe(true)
  })

  test('accepts only excerpts that exist in their named source', () => {
    const document = createTextDocument('Verified   source evidence appears here.', 'evidence.txt')
    const valid = validateCitations([{ sourceId: 'para-1', excerpt: 'source evidence appears here' }], document)
    const invalid = validateCitations([{ sourceId: 'para-1', excerpt: 'fabricated evidence' }, { sourceId: 'missing', excerpt: 'source evidence' }], document)

    expect(valid).toEqual([{ sourceId: 'para-1', label: 'Paragraph 1', excerpt: 'source evidence appears here' }])
    expect(invalid).toEqual([])
    expect(findCitationRange(document.fullText, 'source evidence appears here')).toEqual(expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }))
  })
})
