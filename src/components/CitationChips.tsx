import { BookOpenText } from 'lucide-react'
import type { Citation } from '../lib/document'

interface CitationChipsProps {
  citations: Citation[]
  onOpen: (citation: Citation) => void
  className?: string
}

export default function CitationChips({ citations, onOpen, className = '' }: CitationChipsProps) {
  if (citations.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Supporting sources">
      {citations.map((citation, index) => (
        <button
          key={`${citation.sourceId}-${index}`}
          type="button"
          onClick={() => onOpen(citation)}
          title={citation.excerpt}
          aria-label={`Open supporting source ${citation.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-moss/25 bg-moss-mist/60 px-2.5 py-1 text-[10.5px] font-bold text-moss-deep transition hover:border-moss hover:bg-moss-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss dark:border-white/15 dark:bg-white/5 dark:text-gold-dark dark:hover:border-gold-dark/50"
        >
          <BookOpenText size={11} aria-hidden />
          {citation.label}
        </button>
      ))}
    </div>
  )
}
