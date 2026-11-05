import type { AnalysisResult } from './groq'
import type { Citation, CitedText } from './document'
import type { DocStats } from './stats'

export interface GeneratedMap {
  summary: boolean
  keyPoints: boolean
  keywords: boolean
  sentiment: boolean
  quiz: boolean
}

export const NOTHING_GENERATED: GeneratedMap = { summary: false, keyPoints: false, keywords: false, sentiment: false, quiz: false }

/** Build the downloadable .txt report of everything that was generated. */
export function buildDownloadText(fileName: string, result: Partial<AnalysisResult>, stats: DocStats, generated: GeneratedMap): string {
  const line = '─'.repeat(64)
  const parts: string[] = []
  const sources: Citation[] = []
  const sourceIndexes = new Map<string, number>()
  const withSources = (value: CitedText): string => {
    const markers = value.citations.map(citation => {
      const key = `${citation.sourceId}:${citation.excerpt.replace(/\s+/g, ' ').trim().toLowerCase()}`
      let index = sourceIndexes.get(key)
      if (index === undefined) {
        sources.push(citation)
        index = sources.length
        sourceIndexes.set(key, index)
      }
      return `[${index}]`
    })
    return `${value.text}${markers.length ? ` ${markers.join('')}` : ''}`
  }
  parts.push('DOCENT — Document Analysis Report')
  parts.push(`Source file: ${fileName}`)
  parts.push(`Generated:   ${new Date().toLocaleString()}`)
  parts.push(line)
  parts.push('')

  if (generated.summary && result.title) {
    parts.push(`SUGGESTED TITLE`)
    parts.push(result.title)
    if (result.oneLiner) parts.push(`\nIn one line: ${result.oneLiner}`)
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (generated.summary && result.summary) {
    parts.push('SUMMARY')
    parts.push(withSources(result.summary))
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (generated.keyPoints && result.keyPoints?.length) {
    parts.push('KEY POINTS')
    for (const point of result.keyPoints) parts.push(`•  ${withSources(point)}`)
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (generated.keywords && result.keywords?.length) {
    parts.push('KEYWORDS')
    parts.push(result.keywords.join('  ·  '))
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (generated.sentiment && result.sentiment) {
    const s = result.sentiment
    parts.push('SENTIMENT')
    parts.push(`Verdict:    ${s.label} (${s.score >= 0 ? '+' : ''}${s.score} / ±100)`)
    parts.push(`Confidence: ${s.confidence}%`)
    if (s.tones.length) parts.push(`Tones:      ${s.tones.join(', ')}`)
    parts.push(`Why:        ${s.summary}`)
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (generated.quiz && result.quiz?.length) {
    parts.push('QUIZ (answer key)')
    result.quiz.forEach((q, i) => {
      parts.push(`\nQ${i + 1}. ${q.question}`)
      q.options.forEach((o, j) => parts.push(`   ${String.fromCharCode(65 + j)}. ${o}${j === q.answer ? '   ✓' : ''}`))
      if (q.explanation) parts.push(`   → ${q.explanation}`)
    })
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  if (sources.length > 0) {
    parts.push('SOURCES')
    sources.forEach((citation, index) => parts.push(`[${index + 1}] ${citation.label} — “${citation.excerpt.replace(/\s+/g, ' ').trim()}”`))
    parts.push('')
    parts.push(line)
    parts.push('')
  }
  parts.push('DOCUMENT STATS')
  parts.push(`Words:                ${stats.words.toLocaleString()}`)
  parts.push(`Characters:           ${stats.characters.toLocaleString()} (${stats.charactersNoSpaces.toLocaleString()} without spaces)`)
  parts.push(`Sentences:            ${stats.sentences.toLocaleString()}`)
  parts.push(`Paragraphs:           ${stats.paragraphs.toLocaleString()}`)
  parts.push(`Avg words / sentence: ${stats.avgWordsPerSentence.toFixed(1)}`)
  parts.push(`Vocabulary diversity: ${(stats.lexiconDiversity * 100).toFixed(0)}%`)
  parts.push(`Reading time:         ~${stats.readingTimeLabel} (at 225 wpm)`)
  parts.push('')
  parts.push('Analyzed with Docent · powered by Groq — console.groq.com')
  return parts.join('\n')
}

export function sanitizeFileName(fileName: string): string {
  const parts = fileName.split(/[/\\]/)
  const last = parts[parts.length - 1] || ''
  const base = last.replace(/\.[^.]+$/, '')
  const sanitized = base.replace(/[/\\?%*:|"<>]/g, '_').replace(/^\.+/, '').trim()
  return sanitized || 'document'
}

export function downloadTextFile(fileName: string, content: string) {
  const base = sanitizeFileName(fileName)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${base}-docent-analysis.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
