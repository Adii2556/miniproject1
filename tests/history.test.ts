import { beforeEach, describe, expect, test, vi } from 'vitest'
import { clearHistory, loadHistory, purgeLegacySensitiveStorage, saveHistoryEntry } from '../src/lib/history'
import { createTextDocument } from '../src/lib/document'

describe('session history', () => {
  beforeEach(() => clearHistory())

  test('retains document text only in module memory', () => {
    const entries = saveHistoryEntry({
      fileName: 'private.pdf',
      pageCount: 2,
      words: 100,
      title: 'Private document',
      oneLiner: 'Confidential material',
      document: createTextDocument('sensitive content', 'private.pdf'),
    })

    expect(entries).toHaveLength(1)
    expect(loadHistory()[0].document.fullText).toBe('sensitive content')
  })

  test('purges storage keys created by older releases', () => {
    const localRemove = vi.fn()
    const sessionRemove = vi.fn()
    vi.stubGlobal('localStorage', { removeItem: localRemove })
    vi.stubGlobal('sessionStorage', { removeItem: sessionRemove })

    purgeLegacySensitiveStorage()

    expect(localRemove).toHaveBeenCalledWith('docent.groq-key')
    expect(localRemove).toHaveBeenCalledWith('docent.history.v1')
    expect(localRemove).toHaveBeenCalledWith('arena_vid')
    expect(sessionRemove).toHaveBeenCalledWith('__arena_rec')
  })
})
