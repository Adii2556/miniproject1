import type { DocumentModel } from './document'

export interface HistoryEntry {
  id: string
  savedAt: number
  fileName: string
  pageCount: number | null
  words: number
  title: string
  oneLiner: string
  sentimentLabel?: string
  /** Complete structured document retained only in module memory for this tab. */
  document: DocumentModel
}

const MAX_ENTRIES = 6
let sessionHistory: HistoryEntry[] = []

export function loadHistory(): HistoryEntry[] {
  return [...sessionHistory]
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'savedAt'>): HistoryEntry[] {
  const list = loadHistory()
  const next: HistoryEntry = {
    ...entry,
    document: {
      ...entry.document,
      blocks: entry.document.blocks.map(block => ({ ...block })),
    },
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  }
  const deduped = list.filter(e => e.title !== next.title || e.fileName !== next.fileName)
  sessionHistory = [next, ...deduped].slice(0, MAX_ENTRIES)
  return [...sessionHistory]
}

export function clearHistory(): void {
  sessionHistory = []
}

/** Remove sensitive values written by versions that persisted keys and documents. */
export function purgeLegacySensitiveStorage(): void {
  try {
    localStorage.removeItem('docent.groq-key')
    localStorage.removeItem('docent.groq-key-saved')
    localStorage.removeItem('docent.history.v1')
    localStorage.removeItem('arena_vid')
  } catch {
    // Local storage can be unavailable in hardened browsing modes.
  }

  try {
    sessionStorage.removeItem('__arena_rec')
  } catch {
    // Session storage can be unavailable independently of local storage.
  }
}
