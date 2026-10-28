import {
  KeyRound,
  Trash2,
  Zap,
  ChevronDown,
  Flame,
  Gauge,
  NotebookPen,
  ListChecks,
  Stethoscope,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bot,
  CircleHelp,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import { GROQ_MODELS } from '../lib/groq';
import type { Settings, SummaryStyle } from '../lib/types';

export interface SidebarProps {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  keyInput: string;
  keySource: 'env' | 'session' | 'local' | null;
  envLocked: boolean;
  onKeyInput: (v: string) => void;
  onSaveKey: () => void;
  onForgetKey: () => void;
  remember: boolean;
  onRememberChange: (v: boolean) => void;
  onTestConnection: () => void;
  isTesting: boolean;
  testResult: { ok: boolean; message: string } | null;
  sessionTokens: number;
  collapsed: boolean;
  onToggle: () => void;
  idSuffix?: string;
}

const STYLE_OPTIONS: { id: SummaryStyle; label: string; hint: string }[] = [
  { id: 'concise', label: 'Concise', hint: '2–4 tight sentences' },
  { id: 'executive', label: 'Executive', hint: 'Bottom line first' },
  { id: 'detailed', label: 'Detailed', hint: 'Full breakdown' },
];

export default function Sidebar({
  settings,
  onSettingsChange,
  keyInput,
  keySource,
  envLocked,
  onKeyInput,
  onSaveKey,
  onForgetKey,
  remember,
  onRememberChange,
  onTestConnection,
  isTesting,
  testResult,
  sessionTokens,
  collapsed,
  onToggle,
  idSuffix = '',
}: SidebarProps) {
  const [howOpen, setHowOpen] = useState(false);
  const keyFieldId = `groq-key${idSuffix}`;
  const fillPct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`;

  if (collapsed) {
    return (
      <aside className="flex h-full w-[68px] flex-col items-center gap-3 border-r-2 border-ink bg-cream py-4">
        <button
          onClick={onToggle}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="hard-xs press grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-ink"
        >
          <ChevronRight size={19} strokeWidth={2.4} />
        </button>
        <div className="h-px w-9 bg-ink/15" />
        <div title="API key" className={`grid h-11 w-11 place-items-center rounded-xl border-2 ${keySource ? 'border-leaf bg-leaf-soft text-leaf' : 'border-ink bg-card text-ink-soft'}`}>
          <KeyRound size={19} strokeWidth={2.1} />
        </div>
        <div title="Model" className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-ink-soft">
          <Zap size={19} strokeWidth={2.1} />
        </div>
        <div title="Temperature" className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-ink-soft">
          <Flame size={19} strokeWidth={2.1} />
        </div>
        <div title="Summary style" className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-ink-soft">
          <NotebookPen size={19} strokeWidth={2.1} />
        </div>
        <div title="Quiz" className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-card text-ink-soft">
          <ListChecks size={19} strokeWidth={2.1} />
        </div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <Bot size={20} strokeWidth={2} className="text-coral" aria-hidden />
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-ink-soft [writing-mode:vertical-rl]">Docent</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="nice-scroll flex h-full w-[300px] shrink-0 flex-col overflow-y-auto border-r-2 border-ink bg-cream">
      {/* ---------- collapse + identity ---------- */}
      <div className="flex items-center justify-between border-b border-ink/10 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber" strokeWidth={2.4} aria-hidden />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Control Room</span>
        </div>
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink/15 bg-card text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* ---------- API KEY ---------- */}
        <section aria-labelledby="sb-key">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 id="sb-key" className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              <KeyRound size={12} strokeWidth={2.5} aria-hidden /> Groq API Key
            </h2>
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[10px] font-semibold text-skyc hover:underline">
              Get a key <ExternalLink size={10} strokeWidth={2.5} aria-hidden />
            </a>
          </div>
          <div className="hard-xs rounded-xl border-2 border-ink bg-card p-3">
            {envLocked ? (
              <div className="flex items-start gap-2">
                <Lock size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-leaf" aria-hidden />
                <div>
                  <p className="text-[12px] font-bold leading-snug text-ink">Key supplied via environment</p>
                  <p className="mt-0.5 font-mono text-[10.5px] leading-snug text-ink-soft">VITE_GROQ_API_KEY is set — nothing to configure here.</p>
                </div>
              </div>
            ) : (
              <>
                <label htmlFor={keyFieldId} className="sr-only">Groq API key</label>
                <div className="flex items-center gap-2">
                  <input
                    id={keyFieldId}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="gsk_…"
                    value={keyInput}
                    onChange={(e) => onKeyInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border-2 border-ink/80 bg-paper px-2.5 py-2 font-mono text-[12px] text-ink placeholder-ink/35 outline-none transition focus:border-coral focus:bg-white"
                  />
                  {keyInput && (
                    <button
                      onClick={onForgetKey}
                      title="Forget saved key"
                      aria-label="Forget saved key"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/15 bg-paper text-ink-soft transition-colors hover:border-coral hover:text-coral"
                    >
                      <Trash2 size={15} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-medium text-ink-soft">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => onRememberChange(e.target.checked)}
                      className="h-3.5 w-3.5 accent-coral"
                    />
                    Remember on this device
                  </label>
                  <button
                    onClick={onSaveKey}
                    disabled={!keyInput.trim()}
                    className="press rounded-lg border-2 border-ink bg-amber px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink disabled:cursor-not-allowed disabled:opacity-40 hard-xs"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
            <button
              onClick={onTestConnection}
              disabled={isTesting}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/60 bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-paper transition hover:bg-ink-soft disabled:opacity-60"
            >
              <Stethoscope size={13} strokeWidth={2.3} aria-hidden />
              {isTesting ? 'Pinging Groq…' : 'Test connection'}
            </button>
            {testResult && (
              <div
                role="status"
                className={`mt-2 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold leading-snug ${
                  testResult.ok ? 'border-leaf/50 bg-leaf-soft text-[#0d5c38]' : 'border-coral/50 bg-[#ffe6df] text-coral-deep'
                }`}
              >
                {testResult.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={13} className="mt-0.5 shrink-0" aria-hidden />}
                {testResult.message}
              </div>
            )}
            <p className="mt-2 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ink-soft/80">
              <ShieldCheck size={10} strokeWidth={2.4} aria-hidden /> Key stays in your browser — sent only to api.groq.com
            </p>
          </div>
        </section>

        {/* ---------- MODEL ---------- */}
        <section aria-labelledby="sb-model">
          <h2 id="sb-model" className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            <Zap size={12} strokeWidth={2.5} aria-hidden /> Model
          </h2>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Groq model">
            {GROQ_MODELS.map((m) => {
              const active = settings.model === m.id;
              return (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSettingsChange({ model: m.id })}
                  className={`rounded-xl border-2 px-2.5 py-2 text-left transition-all ${
                    active
                      ? 'hard-xs border-ink bg-amber/25 shadow-[inset_0_0_0_1px_rgba(29,30,40,0.12)]'
                      : 'border-ink/15 bg-card hover:border-ink/60'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border-2 ${active ? 'border-ink bg-coral' : 'border-ink/40 bg-transparent'}`} aria-hidden>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-card" />}
                      </span>
                      <span className="text-[12px] font-bold text-ink">{m.name}</span>
                      {m.tagline === 'Best quality' && (
                        <span className="rounded-full border border-coral bg-coral px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wide text-white">Recommended</span>
                      )}
                    </span>
                    <span className="font-mono text-[9px] font-semibold text-ink-soft">{m.speed} t/s</span>
                  </span>
                  <span className="mt-1 block pl-5 font-mono text-[9px] leading-snug text-ink-soft">{m.price} · {m.context}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- TEMPERATURE ---------- */}
        <section aria-labelledby="sb-temp">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="sb-temp" className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              <Flame size={12} strokeWidth={2.5} aria-hidden /> Temperature
            </h2>
            <span className="hard-xs rounded-md border border-ink bg-card px-1.5 py-0.5 font-mono text-[11px] font-bold text-coral">{settings.temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0} max={1.5} step={0.05}
            value={settings.temperature}
            aria-valuetext={`Temperature ${settings.temperature.toFixed(2)}`}
            onChange={(e) => onSettingsChange({ temperature: Number(e.target.value) })}
            className="docslider"
            style={{ ['--fill' as string]: fillPct(settings.temperature, 0, 1.5) }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
            <span>0 · Precise</span>
            <span>0.7 · Balanced</span>
            <span>1.5 · Wild</span>
          </div>
        </section>

        {/* ---------- MAX TOKENS ---------- */}
        <section aria-labelledby="sb-tokens">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="sb-tokens" className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              <Gauge size={12} strokeWidth={2.5} aria-hidden /> Max Tokens
            </h2>
            <span className="hard-xs rounded-md border border-ink bg-card px-1.5 py-0.5 font-mono text-[11px] font-bold text-coral">{settings.maxTokens.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={256} max={4096} step={128}
            value={settings.maxTokens}
            aria-valuetext={`Max tokens ${settings.maxTokens}`}
            onChange={(e) => onSettingsChange({ maxTokens: Number(e.target.value) })}
            className="docslider"
            style={{ ['--fill' as string]: fillPct(settings.maxTokens, 256, 4096) }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
            <span>256 · Snappy</span>
            <span>4096 · Roomy</span>
          </div>
          {sessionTokens > 0 && (
            <p className="mt-1.5 font-mono text-[9.5px] font-semibold text-ink-soft">Session usage: <span className="text-ink">{sessionTokens.toLocaleString()}</span> tokens</p>
          )}
        </section>

        {/* ---------- SUMMARY STYLE ---------- */}
        <section aria-labelledby="sb-style">
          <h2 id="sb-style" className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            <NotebookPen size={12} strokeWidth={2.5} aria-hidden /> Summary Style
          </h2>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Summary style">
            {STYLE_OPTIONS.map((o) => {
              const active = settings.summaryStyle === o.id;
              return (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSettingsChange({ summaryStyle: o.id })}
                  title={o.hint}
                  className={`rounded-xl border-2 px-2 py-2 text-center transition-all ${
                    active ? 'hard-xs border-ink bg-ink text-paper' : 'border-ink/15 bg-card text-ink hover:border-ink/60'
                  }`}
                >
                  <span className="block text-[11px] font-extrabold">{o.label}</span>
                  <span className={`mt-0.5 block text-[8.5px] leading-tight ${active ? 'text-paper/70' : 'text-ink-soft'}`}>{o.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- QUIZ LENGTH ---------- */}
        <section aria-labelledby="sb-quiz">
          <h2 id="sb-quiz" className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            <ListChecks size={12} strokeWidth={2.5} aria-hidden /> Quiz Length
          </h2>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Quiz question count">
            {[3, 5, 7, 10].map((n) => {
              const active = settings.quizCount === n;
              return (
                <button
                  key={n}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSettingsChange({ quizCount: n })}
                  className={`rounded-xl border-2 py-2 font-mono text-[13px] font-bold transition-all ${
                    active ? 'hard-xs border-ink bg-coral text-white' : 'border-ink/15 bg-card text-ink hover:border-ink/60'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="overflow-hidden rounded-xl border-2 border-dashed border-ink/30 bg-paper">
          <button
            onClick={() => setHowOpen((v) => !v)}
            aria-expanded={howOpen}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              <CircleHelp size={12} strokeWidth={2.5} aria-hidden /> How Docent works
            </span>
            <ChevronDown size={14} strokeWidth={2.5} className={`text-ink-soft transition-transform duration-200 ${howOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {howOpen && (
            <ol className="space-y-2 border-t border-dashed border-ink/25 px-3 py-3 text-[11.5px] leading-snug text-ink-soft">
              <li className="flex gap-2"><span className="font-mono font-bold text-coral">1</span> You drop in a PDF or text file (or a sample — no file needed).</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-coral">2</span> Text is extracted locally — the file never leaves your browser.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-coral">3</span> Groq runs a two-pass analysis: insights + quiz, in seconds.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-coral">4</span> Everything lands here as a chat you can quiz yourself with.</li>
            </ol>
          )}
        </section>
      </div>

      <div className="mt-auto border-t border-ink/10 px-4 py-3">
        <p className="font-mono text-[9px] leading-relaxed text-ink-soft/75">
          DOCENT v1.0 · MODEL FLAGSHIP: GPT-OSS 120B ON GROQ LPU™<br />Built with Vite + React + Tailwind
        </p>
      </div>
    </aside>
  );
}
