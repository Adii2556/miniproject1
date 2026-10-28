import type { ReactNode } from 'react';
import { FileText, File, AlertTriangle, Sparkles, User } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared shells for DocLense's chat-style message feed                */
/* ------------------------------------------------------------------ */

export function Avatar({ kind }: { kind: 'user' | 'ai' | 'error' }) {
  if (kind === 'user')
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-skyc text-white" title="You">
        <User size={17} strokeWidth={2.3} aria-hidden />
      </div>
    );
  if (kind === 'error')
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-coral text-white" title="Problem">
        <AlertTriangle size={17} strokeWidth={2.3} aria-hidden />
      </div>
    );
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-amber" title="DocLense" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="7" width="14" height="12" rx="3.2" stroke="#1d1e28" strokeWidth="1.9"/>
        <circle cx="9.6" cy="13" r="1.15" fill="#1d1e28"/>
        <circle cx="14.4" cy="13" r="1.15" fill="#1d1e28"/>
        <path d="M12 7V4.4" stroke="#1d1e28" strokeWidth="1.9" strokeLinecap="round"/>
        <circle cx="12" cy="3.4" r="1" fill="#ff4b33"/>
      </svg>
    </div>
  );
}

export function AiBubble({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="msg-in flex w-full items-end gap-2.5 sm:gap-3" aria-label="DocLense message">
      <Avatar kind="ai" />
      <div id={id} className="max-w-[640px] rounded-2xl rounded-bl-md border-2 border-ink bg-card px-4 py-3 shadow-[3px_3px_0_0_rgba(29,30,40,0.9)]">
        {children}
      </div>
    </div>
  );
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="msg-in flex w-full flex-row-reverse items-end gap-2.5 sm:gap-3" aria-label="Your message">
      <Avatar kind="user" />
      <div className="max-w-[640px] rounded-2xl rounded-br-md border-2 border-ink bg-ink px-4 py-3 text-paper shadow-[3px_3px_0_0_rgba(29,30,40,0.35)]">
        {children}
      </div>
    </div>
  );
}

export function ErrorBubble({ children }: { children: ReactNode }) {
  return (
    <div className="msg-in flex w-full items-end gap-2.5 sm:gap-3" role="alert">
      <Avatar kind="error" />
      <div className="max-w-[560px] rounded-2xl rounded-bl-md border-2 border-coral-deep bg-[#fff0ec] px-4 py-3 shadow-[3px_3px_0_0_#e8402a]">
        {children}
      </div>
    </div>
  );
}

export function AnalysisCard({
  title,
  icon,
  accent,
  right,
  children,
  pad = true,
}: {
  title: string;
  icon: ReactNode;
  accent: string;
  right?: ReactNode;
  pad?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-ink bg-card">
      <header className="flex items-center justify-between gap-2 border-b-2 border-ink px-3.5 py-1.5" style={{ background: accent }}>
        <h3 className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink">
          <span aria-hidden className="text-ink">{icon}</span>
          {title}
        </h3>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className={pad ? 'px-4 py-3.5' : ''}>{children}</div>
    </section>
  );
}

export function FileChip({ name, kind, sizeLabel }: { name: string; kind: 'pdf' | 'text' | 'sample'; sizeLabel: string }) {
  const Icon = kind === 'pdf' ? FileText : File;
  const badge = kind === 'pdf' ? 'PDF' : kind === 'sample' ? 'SAMPLE' : 'TXT';
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-paper/25 bg-paper/10 py-1 pl-1.5 pr-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-amber bg-amber text-ink">
        <Icon size={13} strokeWidth={2.4} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block max-w-[220px] truncate text-[12px] font-semibold leading-tight text-paper">{name}</span>
        <span className="block font-mono text-[8.5px] uppercase tracking-wider text-paper/60">{badge} · {sizeLabel}</span>
      </span>
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-ink-soft/80">
      <Sparkles size={9} strokeWidth={2.5} aria-hidden /> {children}
    </div>
  );
}
