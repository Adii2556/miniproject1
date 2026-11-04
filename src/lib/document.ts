export interface SourceBlock {
  id: string
  label: string
  text: string
  pageNumber?: number
  paragraphNumber?: number
}

export interface DocumentModel {
  fileName: string
  kind: 'PDF' | 'TEXT'
  fullText: string
  blocks: SourceBlock[]
  pageCount: number | null
}

export interface DocumentChunk {
  id: string
  index: number
  text: string
  sourceIds: string[]
  labels: string[]
}

export interface Citation {
  sourceId: string
  label: string
  excerpt: string
}

export interface CitedText {
  text: string
  citations: Citation[]
}

export interface AnalysisCoverage {
  mode: 'complete' | 'sampled'
  totalChunks: number
  analyzedChunkIds: string[]
  labels: string[]
}

export const CHUNK_TARGET_CHARS = 12_000
export const CHUNK_OVERLAP_CHARS = 600
export const DIRECT_ANALYSIS_MAX_CHARS = 24_000
export const MAX_ANALYSIS_CHUNKS = 6

const normalizeBlockText = (text: string) => text
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

export function createTextDocument(text: string, fileName: string): DocumentModel {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  let paragraphs = normalized.split(/\n\s*\n/).map(normalizeBlockText).filter(Boolean)
  if (paragraphs.length === 1 && normalized.includes('\n')) {
    paragraphs = normalized.split(/\n+/).map(normalizeBlockText).filter(Boolean)
  }
  if (paragraphs.length === 0 && normalized) paragraphs = [normalized]

  const blocks = paragraphs.map((paragraph, index): SourceBlock => ({
    id: `para-${index + 1}`,
    label: `Paragraph ${index + 1}`,
    paragraphNumber: index + 1,
    text: paragraph,
  }))

  return {
    fileName,
    kind: 'TEXT',
    fullText: blocks.map(block => block.text).join('\n\n'),
    blocks,
    pageCount: null,
  }
}

export function createPdfDocument(fileName: string, pageTexts: string[]): DocumentModel {
  const blocks = pageTexts.map((pageText, index): SourceBlock => ({
    id: `p${index + 1}`,
    label: `Page ${index + 1}`,
    pageNumber: index + 1,
    text: normalizeBlockText(pageText),
  }))

  return {
    fileName,
    kind: 'PDF',
    fullText: blocks.map(block => block.text).join('\n\n'),
    blocks,
    pageCount: pageTexts.length,
  }
}

export function coerceDocument(input: DocumentModel | string, fileName = 'Document.txt'): DocumentModel {
  return typeof input === 'string' ? createTextDocument(input, fileName) : input
}

interface ChunkPart {
  sourceId: string
  label: string
  text: string
}

function splitBlock(block: SourceBlock, maxChars: number): ChunkPart[] {
  if (block.text.length <= maxChars) return [{ sourceId: block.id, label: block.label, text: block.text }]
  const parts: ChunkPart[] = []
  for (let offset = 0; offset < block.text.length; offset += maxChars) {
    parts.push({ sourceId: block.id, label: block.label, text: block.text.slice(offset, offset + maxChars) })
  }
  return parts
}

const partLength = (part: ChunkPart) => part.text.length + part.label.length + part.sourceId.length + 16

function renderChunk(parts: ChunkPart[], index: number): DocumentChunk {
  const sourceIds = [...new Set(parts.map(part => part.sourceId))]
  const labels = [...new Set(parts.map(part => part.label))]
  return {
    id: `chunk-${index + 1}`,
    index,
    sourceIds,
    labels,
    text: parts.map(part => `SOURCE ${part.sourceId} (${part.label})\n${part.text}`).join('\n\n'),
  }
}

export function buildDocumentChunks(
  document: DocumentModel,
  targetChars = CHUNK_TARGET_CHARS,
  overlapChars = CHUNK_OVERLAP_CHARS,
): DocumentChunk[] {
  if (document.blocks.length === 0) return []
  const safeTarget = Math.max(2_000, targetChars)
  const safeOverlap = Math.min(Math.max(0, overlapChars), Math.floor(safeTarget / 3))
  const atomicParts = document.blocks.flatMap(block => splitBlock(block, safeTarget - 300))
  const chunks: DocumentChunk[] = []
  let current: ChunkPart[] = []
  let currentLength = 0

  for (const part of atomicParts) {
    const length = partLength(part)
    if (current.length > 0 && currentLength + length > safeTarget) {
      chunks.push(renderChunk(current, chunks.length))
      const previous = current.at(-1)
      if (previous && safeOverlap > 0) {
        const overlapText = previous.text.slice(-safeOverlap)
        current = [{ ...previous, text: overlapText }]
        currentLength = partLength(current[0])
      } else {
        current = []
        currentLength = 0
      }
    }
    current.push(part)
    currentLength += length
  }

  if (current.length > 0) chunks.push(renderChunk(current, chunks.length))
  return chunks
}

export function selectAnalysisChunks(chunks: DocumentChunk[], maxChunks = MAX_ANALYSIS_CHUNKS): DocumentChunk[] {
  if (chunks.length <= maxChunks) return [...chunks]
  const indexes = new Set<number>([0, chunks.length - 1])
  for (let position = 1; position < maxChunks - 1; position++) {
    indexes.add(Math.round((position * (chunks.length - 1)) / (maxChunks - 1)))
  }
  return [...indexes].sort((a, b) => a - b).slice(0, maxChunks).map(index => chunks[index])
}

export function buildCoverage(allChunks: DocumentChunk[], selectedChunks: DocumentChunk[]): AnalysisCoverage {
  return {
    mode: selectedChunks.length === allChunks.length ? 'complete' : 'sampled',
    totalChunks: allChunks.length,
    analyzedChunkIds: selectedChunks.map(chunk => chunk.id),
    labels: selectedChunks.map(chunk => {
      const first = chunk.labels[0]
      const last = chunk.labels.at(-1)
      return first && last && first !== last ? `${first}–${last}` : (first ?? chunk.id)
    }),
  }
}

const queryTerms = (text: string) => [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? [])]

export function rankChunksForQuestion(chunks: DocumentChunk[], question: string, limit = 5): DocumentChunk[] {
  if (chunks.length <= limit) return [...chunks]
  const terms = queryTerms(question)
  const ranked = chunks.map((chunk, index) => {
    const lower = chunk.text.toLowerCase()
    const score = terms.reduce((total, term) => {
      let count = 0
      let cursor = lower.indexOf(term)
      while (cursor !== -1 && count < 12) {
        count += 1
        cursor = lower.indexOf(term, cursor + term.length)
      }
      return total + count
    }, 0)
    return { chunk, index, score }
  }).sort((a, b) => b.score - a.score || a.index - b.index)

  const chosen = ranked.slice(0, Math.min(4, limit)).map(item => item.chunk)
  const chosenIndexes = new Set(chosen.map(chunk => chunk.index))
  const bestIndex = ranked[0]?.index ?? 0
  const adjacentIndex = [bestIndex + 1, bestIndex - 1].find(index => index >= 0 && index < chunks.length && !chosenIndexes.has(index))
  if (adjacentIndex !== undefined && chosen.length < limit) chosen.push(chunks[adjacentIndex])
  return chosen.sort((a, b) => a.index - b.index)
}

export function normalizeForCitation(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

export function validateCitations(
  citations: Array<{ sourceId: string; excerpt: string }>,
  document: DocumentModel,
): Citation[] {
  const blocks = new Map(document.blocks.map(block => [block.id, block]))
  const valid: Citation[] = []
  const seen = new Set<string>()

  for (const candidate of citations) {
    const block = blocks.get(candidate.sourceId)
    const excerpt = candidate.excerpt.trim().slice(0, 600)
    if (!block || excerpt.length < 8) continue
    if (!normalizeForCitation(block.text).includes(normalizeForCitation(excerpt))) continue
    const key = `${block.id}:${normalizeForCitation(excerpt)}`
    if (seen.has(key)) continue
    seen.add(key)
    valid.push({ sourceId: block.id, label: block.label, excerpt })
    if (valid.length === 4) break
  }
  return valid
}

export function findCitationRange(source: string, excerpt: string): { start: number; end: number } | null {
  const normalizedSource: string[] = []
  const sourceIndexes: number[] = []
  let previousWasSpace = false
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    const isSpace = /\s/.test(character)
    if (isSpace) {
      if (previousWasSpace) continue
      normalizedSource.push(' ')
      sourceIndexes.push(index)
      previousWasSpace = true
    } else {
      normalizedSource.push(character.toLocaleLowerCase())
      sourceIndexes.push(index)
      previousWasSpace = false
    }
  }
  const needle = normalizeForCitation(excerpt)
  const haystack = normalizedSource.join('').trim()
  const offset = normalizedSource.join('').indexOf(needle)
  if (!needle || offset < 0) return null
  const start = sourceIndexes[offset] ?? 0
  const finalNormalizedIndex = offset + needle.length - 1
  const end = Math.min(source.length, (sourceIndexes[finalNormalizedIndex] ?? start) + 1)
  return haystack.includes(needle) ? { start, end } : null
}
