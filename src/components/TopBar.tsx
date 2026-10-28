import { Trash2, Menu, Settings2, X, Sparkles, RefreshCw } from 'lucide-react';

export default function TopBar({
  keyReady,
  onClear,
  onOpenSidebar,
  sidebarVisible,
  canRegenerate,
  onRegenerate,
}: {
  keyReady: boolean;
  onClear: () => void;
  onOpenSidebar: () => void;
  sidebarVisible: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-2 border-ink bg-paper px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {/* ---------- logo ---------- */}
        <a href="#" onClick={(e) => e.preventDefault()} aria-label="Docent home" className="flex shrink-0 select-none items-center gap-2">
          <span className="hard-xs grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-ink" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M6 3h8l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V4.5A1.5 1.5 0 0 1 7.5 3z" stroke="#f6f4ec" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"/>
              <line x1="9" y1="11.5" x2="15" y2="11.5" stroke="#ff4b33" strokeWidth="1.7" strokeLinecap="round"/>
              <line x1="9" y1="14.5" x2="13.5" y2="14.5" stroke="#f6f4ec" strokeWidth="1.7" strokeLinecap="round"/>
              <circle cx="17.6" cy="17.6" r="2.6" fill="#ffb43a" stroke="#1d1e28" strokeWidth="1.4"/>
            </svg>
          </span>
          <span className="leading-none">
            <span className="font-display text-[21px] font-black tracking-tight text-ink">Docent</span>
            <span className="mt-0.5 hidden font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-ink-soft sm:block">Document Analysis Studio</span>
          </span>
        </a>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {/* ---------- groq status chip ---------- */}
        <div
          title={keyReady ? 'A Groq API key is configured — analysis runs on Groq LPUs' : 'No API key yet — add one in the sidebar'}
          className={`hidden items-center gap-1.5 rounded-full border-2 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider md:flex ${
            keyReady ? 'border-leaf/60 bg-leaf-soft text-[#0d5c38]' : 'border-amber/70 bg-[#fff3d6] text-[#8a5b00]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${keyReady ? 'bg-leaf' : 'bg-amber'} animate-pulse`} aria-hidden />
          {keyReady ? 'Groq · Online' : 'Key needed'}
        </div>

        {/* ---------- powered-by ---------- */}
        <div className="hidden items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-soft lg:flex" title="Model inference by GroqCloud">
          <Sparkles size={11} strokeWidth={2.5} className="text-amber" aria-hidden />
          Powered by Groq
        </div>

        {/* ---------- regenerate ---------- */}
        {canRegenerate && onRegenerate && (
          <button
            onClick={onRegenerate}
            title="Regenerate analysis for this document"
            aria-label="Regenerate analysis"
            className="hard-xs press flex h-9 items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-2.5 font-mono text-[10px] font-black uppercase tracking-wider text-ink transition-transform hover:scale-105"
          >
            <RefreshCw size={13} strokeWidth={2.6} aria-hidden />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
        )}

        {/* ---------- clear ---------- */}
        <button
          onClick={onClear}
          title="Clear workspace"
          aria-label="Clear workspace"
          className="flex h-9 items-center gap-1.5 rounded-lg border-2 border-ink/15 bg-card px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-soft transition-all hover:border-coral hover:text-coral sm:px-2.5"
        >
          <Trash2 size={15} strokeWidth={2.2} aria-hidden />
          <span className="hidden sm:inline">Clear</span>
        </button>

        {/* ---------- mobile sidebar toggle ---------- */}
        <button
          onClick={onOpenSidebar}
          title={sidebarVisible ? 'Close settings' : 'Open settings'}
          aria-label={sidebarVisible ? 'Close settings panel' : 'Open settings panel'}
          aria-expanded={sidebarVisible}
          className="hard-xs grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-card text-ink transition-colors lg:hidden"
        >
          {sidebarVisible ? <X size={17} strokeWidth={2.3} /> : <Menu size={17} strokeWidth={2.3} />}
        </button>
        <button
          onClick={onOpenSidebar}
          title="Settings"
          aria-label="Toggle settings panel"
          aria-expanded={sidebarVisible}
          className="hard-xs hidden h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-card text-ink transition-colors hover:bg-amber/30 lg:grid"
        >
          <Settings2 size={17} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
