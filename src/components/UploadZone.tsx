import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  UploadCloud,
  FileText,
  File as FileIcon,
  ShieldCheck,
  Zap,
  Sparkles,
  CloudUpload,
  TrendingUp,
  Newspaper,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { SAMPLES, type SampleDoc } from '../lib/samples';
import { ACCEPT_ATTR, formatBytes, MAX_FILE_BYTES } from '../lib/extract';

interface UploadZoneProps {
  variant: 'hero' | 'compact';
  onFile: (file: File) => void;
  onSample: (sample: SampleDoc) => void;
  busy: boolean;
}

const SAMPLE_ICONS = [TrendingUp, Newspaper, Flame];

function sampleSizeLabel(s: SampleDoc) {
  return `${formatBytes(new Blob([s.content]).size)} · ${s.wordsHint}`;
}

export default function UploadZone({ variant, onFile, onSample, busy }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && !busy) onFile(file);
    },
    [onFile, busy]
  );

  const onDragOver = (e: DragEvent) => e.preventDefault();
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) setDragging(false);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  /* ---------- shared drop target visuals ---------- */
  const dropTarget = (compact: boolean) => (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF or text file to analyze"
      aria-disabled={busy}
      onClick={() => !busy && pick()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busy) pick(); }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border-[2.5px] border-dashed text-center transition-all duration-200 ${
        dragging
          ? 'border-coral bg-[#ffe9e4] scale-[1.01]'
          : 'border-ink/45 bg-card hover:border-ink hover:bg-[#fffef9]'
      } ${compact ? 'px-5 py-5' : 'px-6 py-9 sm:py-11'} ${busy ? 'pointer-events-none opacity-60' : ''}`}
    >
      {/* dashed corner accents */}
      <span aria-hidden className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 border-l-[3px] border-t-[3px] border-ink/35" />
      <span aria-hidden className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 border-r-[3px] border-t-[3px] border-ink/35" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-3.5 w-3.5 border-b-[3px] border-l-[3px] border-ink/35" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 h-3.5 w-3.5 border-b-[3px] border-r-[3px] border-ink/35" />

      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} onChange={onChange} className="sr-only" aria-hidden tabIndex={-1} />

      <div className={`mx-auto grid place-items-center rounded-2xl border-2 border-ink bg-amber hard-sm transition-transform duration-200 group-hover:-translate-y-1 ${compact ? 'h-14 w-14' : 'h-[76px] w-[76px]'}`}>
        <CloudUpload size={compact ? 26 : 34} strokeWidth={2.1} className="text-ink" aria-hidden />
      </div>

      <p className={`mt-3 font-display font-black tracking-tight text-ink ${compact ? 'text-[17px]' : 'text-[21px] sm:text-[24px]'}`}>
        {dragging ? 'Drop it like it’s hot!' : compact ? 'Drop another file here' : 'Drop your file here'}
      </p>
      <p className="mt-1 text-[11.5px] font-medium text-ink-soft">
        or <span className="font-bold text-coral underline decoration-coral/40 underline-offset-2">browse from your device</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-soft">
        <span className="flex items-center gap-1 rounded-md border border-ink/30 bg-paper px-1.5 py-1"><FileText size={11} strokeWidth={2.5} className="text-coral" aria-hidden />PDF</span>
        <span className="flex items-center gap-1 rounded-md border border-ink/30 bg-paper px-1.5 py-1"><FileIcon size={11} strokeWidth={2.5} className="text-skyc" aria-hidden />TXT</span>
        <span className="flex items-center gap-1 rounded-md border border-ink/30 bg-paper px-1.5 py-1"><FileIcon size={11} strokeWidth={2.5} className="text-leaf" aria-hidden />MD / CSV</span>
        <span className="rounded-md border border-ink/30 bg-paper px-1.5 py-1">max {formatBytes(MAX_FILE_BYTES)}</span>
      </div>
    </div>
  );

  /* ================= HERO VARIANT (empty state) ================= */
  if (variant === 'hero') {
    return (
      <div className="dotgrid relative flex h-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-6">
        {/* ambient glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-amber/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />

        <div className="relative grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* ---------- left: copy + illustration ---------- */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink hard-xs">
              <Zap size={11} strokeWidth={2.6} className="text-amber" aria-hidden /> Groq LPU inside
            </span>
            <h1 className="font-display mt-3 max-w-md text-[34px] font-black leading-[1.04] tracking-tight text-ink sm:text-[42px] lg:max-w-none">
              Understand any<br />document in<br /><span className="relative inline-block">seconds.<span aria-hidden className="absolute -bottom-1 left-0 h-[6px] w-full -skew-x-6 rounded-sm bg-amber/70" /></span>
            </h1>
            <p className="mt-3 max-w-sm text-[13px] leading-snug text-ink-soft">
              Drop in a PDF or text file. DocLense hands you a clean chat-style breakdown — summary, key points, keywords, sentiment, stats and a quiz — all in one friendly feed.
            </p>
            <img
              src="/images/empty-state.png"
              alt="Illustration of a friendly robot floating beside an open document with idea bubbles"
              className="floaty mt-4 hidden w-[270px] select-none xl:block"
              draggable={false}
            />
          </div>

          {/* ---------- right: dropzone + samples ---------- */}
          <div className="flex w-full flex-col items-stretch">
            {dropTarget(false)}

            <div className="mt-3.5 flex items-center gap-2">
              <span aria-hidden className="h-px flex-1 bg-ink/25" />
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.22em] text-ink-soft">or try a sample</span>
              <span aria-hidden className="h-px flex-1 bg-ink/25" />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-3">
              {SAMPLES.map((sample, i) => {
                const Icon = SAMPLE_ICONS[i] ?? FileText;
                const toneStyle = sample.tone === 'Positive' ? 'text-leaf' : sample.tone === 'Mixed' ? 'text-[#8b5cf6]' : 'text-skyc';
                return (
                  <button
                    key={sample.id}
                    onClick={() => onSample(sample)}
                    disabled={busy}
                    className="hard-sm group flex items-center gap-2 rounded-xl border-2 border-ink bg-card px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:bg-[#fffef4] disabled:opacity-60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/20 bg-paper">
                      <Icon size={17} strokeWidth={2.2} className={toneStyle} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10.5px] font-extrabold leading-tight text-ink">{sample.label}</span>
                      <span className="mt-0.5 block font-mono text-[8px] font-semibold uppercase tracking-wide text-ink-soft">{sample.tone} · {sample.wordsHint}</span>
                    </span>
                    <ArrowRight size={13} strokeWidth={2.6} className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-coral" aria-hidden />
                  </button>
                );
              })}
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-ink-soft/85">
              <ShieldCheck size={11} strokeWidth={2.5} aria-hidden /> Files are parsed locally in your browser
            </p>
          </div>
        </div>

        {/* floating sparkles */}
        <Sparkles aria-hidden size={18} strokeWidth={2} className="absolute left-[8%] top-[26%] hidden text-amber lg:block" />
        <Sparkles aria-hidden size={14} strokeWidth={2} className="absolute right-[10%] top-[18%] hidden text-coral lg:block" />
      </div>
    );
  }

  /* ================= COMPACT VARIANT (bottom of feed) ================= */
  return (
    <div className="mx-auto w-full max-w-[720px]">
      {dropTarget(true)}
      <div className="mt-1.5 flex items-center justify-center gap-2">
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-ink-soft/80">samples:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSample(s)}
            disabled={busy}
            className="rounded-full border border-ink/35 bg-card px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-ink-soft transition-colors hover:border-ink hover:text-coral disabled:opacity-50"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
