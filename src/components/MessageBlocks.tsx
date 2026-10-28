import { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  PenLine,
  AlignLeft,
  ChevronDown,
  ListChecks,
  KeyRound,
  ScanSearch,
  BarChart3,
  BookOpenCheck,
  Type,
  Timer,
  WholeWord,
  Gauge,
  Pilcrow,
  TriangleAlert,
  Feather,
  RefreshCw,
  ListTodo,
  CircleAlert,
  Hash,
  CircleCheck,
  SlidersHorizontal,
  Sparkles,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import type {
  AnalysisOptions,
  AnalysisResult,
  DocStats,
  FileMeta,
  SummaryStyle,
  UsageInfo,
} from '../lib/types';
import { formatBytes, formatNumber, formatReadingTime } from '../lib/extract';
import { AiBubble, ErrorBubble, UserBubble, AnalysisCard, FileChip } from './messages';
import AIMarkdown from './AIMarkdown';
import QuizCard from './QuizCard';

export type Phase = 'idle' | 'configuring' | 'analyzing' | 'done' | 'error';

/* ============ 1 · the file the user uploaded, as a chat message ============ */

export function FileMessage({ meta, note }: { meta: FileMeta; note?: string }) {
  return (
    <UserBubble>
      <p className="mb-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.22em] text-paper/55">Dropped in a file</p>
      <FileChip
        name={meta.name}
        kind={note === 'sample' ? 'sample' : meta.kind}
        sizeLabel={meta.pages ? `${meta.pages} pages · ${formatBytes(meta.sizeBytes)}` : formatBytes(meta.sizeBytes)}
      />
    </UserBubble>
  );
}

/* ============ 1.5 · Document Options Checklist (Configuring State) ============ */

export interface ConfigOptionsCardProps {
  meta: FileMeta;
  stats: DocStats;
  options: AnalysisOptions;
  onOptionsChange: (options: AnalysisOptions) => void;
  onGenerate: () => void;
  onCancel: () => void;
  summaryStyle: SummaryStyle;
  onSummaryStyleChange: (style: SummaryStyle) => void;
  quizCount: number;
  onQuizCountChange: (count: number) => void;
}

export function ConfigOptionsCard({
  meta,
  stats,
  options,
  onOptionsChange,
  onGenerate,
  onCancel,
  summaryStyle,
  onSummaryStyleChange,
  quizCount,
  onQuizCountChange,
}: ConfigOptionsCardProps) {
  const toggle = (key: keyof AnalysisOptions) => {
    onOptionsChange({ ...options, [key]: !options[key] });
  };

  const selectedCount = Object.values(options).filter(Boolean).length;
  const allSelected = selectedCount === 5;

  const selectAll = () => {
    onOptionsChange({
      summary: true,
      keyPoints: true,
      keywords: true,
      sentiment: true,
      quiz: true,
    });
  };

  const deselectAll = () => {
    onOptionsChange({
      summary: false,
      keyPoints: false,
      keywords: false,
      sentiment: false,
      quiz: false,
    });
  };

  return (
    <AiBubble id="config-anchor">
      <div className="w-[min(560px,calc(100vw-118px))]">
        {/* Header */}
        <div className="mb-3 border-b-2 border-ink/15 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-display text-[17px] font-black tracking-tight text-ink">
              <Sparkles size={16} strokeWidth={2.4} className="text-amber" aria-hidden />
              Choose What to Generate
            </h3>
            <div className="flex items-center gap-2 font-mono text-[9.5px] font-bold">
              <button
                type="button"
                onClick={allSelected ? deselectAll : selectAll}
                className="text-coral underline hover:text-coral-deep"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>
          <p className="mt-1 font-mono text-[9px] font-semibold text-ink-soft">
            {meta.name} · {formatNumber(stats.words)} words · ~{formatReadingTime(stats.readingTimeSec)} read
          </p>
        </div>

        {/* Checkbox Options Grid */}
        <div className="space-y-2.5">
          {/* Summary Option */}
          <div
            onClick={() => toggle('summary')}
            className={`cursor-pointer rounded-xl border-2 transition-all duration-150 p-3 ${
              options.summary
                ? 'border-ink bg-card hard-xs shadow-[2px_2px_0_0_#1d1e28]'
                : 'border-ink/25 bg-paper/60 opacity-75 hover:border-ink/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 text-coral ${options.summary ? 'text-coral' : 'text-ink-soft/40'}`}>
                {options.summary ? (
                  <CheckSquare size={17} strokeWidth={2.6} />
                ) : (
                  <Square size={17} strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    Summary
                  </span>
                  <span className="rounded bg-coral/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-coral-deep">
                    Overview
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  Core thesis, context, arguments, and conclusions.
                </p>
                {options.summary && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-ink/20 pt-2"
                  >
                    <span className="font-mono text-[9px] font-semibold uppercase text-ink-soft">Style:</span>
                    {(['concise', 'executive', 'detailed'] as SummaryStyle[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onSummaryStyleChange(st)}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide transition-colors ${
                          summaryStyle === st
                            ? 'border-ink bg-amber text-ink'
                            : 'border-ink/25 bg-paper text-ink-soft hover:border-ink'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Key Points Option */}
          <div
            onClick={() => toggle('keyPoints')}
            className={`cursor-pointer rounded-xl border-2 transition-all duration-150 p-3 ${
              options.keyPoints
                ? 'border-ink bg-card hard-xs shadow-[2px_2px_0_0_#1d1e28]'
                : 'border-ink/25 bg-paper/60 opacity-75 hover:border-ink/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 text-coral ${options.keyPoints ? 'text-coral' : 'text-ink-soft/40'}`}>
                {options.keyPoints ? (
                  <CheckSquare size={17} strokeWidth={2.6} />
                ) : (
                  <Square size={17} strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    Key Points
                  </span>
                  <span className="rounded bg-leaf/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-leaf">
                    Takeaways
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  4 to 6 numbered takeaways highlighting essential evidence and findings.
                </p>
              </div>
            </div>
          </div>

          {/* Keywords Option */}
          <div
            onClick={() => toggle('keywords')}
            className={`cursor-pointer rounded-xl border-2 transition-all duration-150 p-3 ${
              options.keywords
                ? 'border-ink bg-card hard-xs shadow-[2px_2px_0_0_#1d1e28]'
                : 'border-ink/25 bg-paper/60 opacity-75 hover:border-ink/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 text-coral ${options.keywords ? 'text-coral' : 'text-ink-soft/40'}`}>
                {options.keywords ? (
                  <CheckSquare size={17} strokeWidth={2.6} />
                ) : (
                  <Square size={17} strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    Keywords
                  </span>
                  <span className="rounded bg-skyc/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-skyc">
                    Vocabulary
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  8 to 12 topical tags and key concept indicators for rapid scanning.
                </p>
              </div>
            </div>
          </div>

          {/* Sentiment Analysis Option */}
          <div
            onClick={() => toggle('sentiment')}
            className={`cursor-pointer rounded-xl border-2 transition-all duration-150 p-3 ${
              options.sentiment
                ? 'border-ink bg-card hard-xs shadow-[2px_2px_0_0_#1d1e28]'
                : 'border-ink/25 bg-paper/60 opacity-75 hover:border-ink/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 text-coral ${options.sentiment ? 'text-coral' : 'text-ink-soft/40'}`}>
                {options.sentiment ? (
                  <CheckSquare size={17} strokeWidth={2.6} />
                ) : (
                  <Square size={17} strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    Sentiment Analysis
                  </span>
                  <span className="rounded bg-[#ffb43a]/25 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-ink">
                    Tone Gauge
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  Polarity score (−1 to +1), confidence rating, and tone explanation.
                </p>
              </div>
            </div>
          </div>

          {/* Comprehension Quiz Option */}
          <div
            onClick={() => toggle('quiz')}
            className={`cursor-pointer rounded-xl border-2 transition-all duration-150 p-3 ${
              options.quiz
                ? 'border-ink bg-card hard-xs shadow-[2px_2px_0_0_#1d1e28]'
                : 'border-ink/25 bg-paper/60 opacity-75 hover:border-ink/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 text-coral ${options.quiz ? 'text-coral' : 'text-ink-soft/40'}`}>
                {options.quiz ? (
                  <CheckSquare size={17} strokeWidth={2.6} />
                ) : (
                  <Square size={17} strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    Comprehension Quiz
                  </span>
                  <span className="rounded bg-[#8b5cf6]/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#713fcf]">
                    Interactive
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  Self-scoring multiple-choice comprehension questions with explanations.
                </p>
                {options.quiz && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-ink/20 pt-2"
                  >
                    <span className="font-mono text-[9px] font-semibold uppercase text-ink-soft">Questions:</span>
                    {[3, 5, 7, 10].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => onQuizCountChange(cnt)}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide transition-colors ${
                          quizCount === cnt
                            ? 'border-ink bg-amber text-ink'
                            : 'border-ink/25 bg-paper text-ink-soft hover:border-ink'
                        }`}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t-2 border-ink/15 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft hover:text-ink"
          >
            ← Upload different file
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onGenerate}
            className="hard-xs press flex items-center gap-2 rounded-xl border-2 border-ink bg-amber px-4 py-2 text-[12px] font-black uppercase tracking-wider text-ink disabled:opacity-45 disabled:pointer-events-none"
          >
            <Sparkles size={14} strokeWidth={2.6} />
            Generate Analysis ({selectedCount})
          </button>
        </div>
      </div>
    </AiBubble>
  );
}

/* ============ 2 · “reading & analyzing…” live state ============ */

export const BUSY_STEPS = [
  'Reading every word of your document…',
  'Mapping the key ideas…',
  'Weighing the sentiment…',
  'Cooking up quiz questions…',
  'Polishing the final card…',
];

export function BusyMessage({ stepIndex }: { stepIndex: number }) {
  return (
    <AiBubble>
      <p className="mb-2.5 text-[13px] font-bold leading-snug text-ink">
        On it — analyzing your document with Groq…
      </p>
      <ol className="space-y-2" aria-label="Analysis progress">
        {BUSY_STEPS.map((label, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                  done ? 'border-leaf bg-leaf text-white' : active ? 'border-ink bg-amber' : 'border-ink/20 bg-paper'
                }`}
                style={{ height: 18, width: 18 }}
                aria-hidden
              >
                {done ? (
                  <Check size={11} strokeWidth={3.4} />
                ) : active ? (
                  <span className="flex gap-0.5"><span className="h-1 w-1 rounded-full bg-ink" /><span className="h-1 w-1 rounded-full bg-ink" /><span className="h-1 w-1 rounded-full bg-ink" /></span>
                ) : null}
              </span>
              <span className={`text-[11.5px] leading-tight transition-colors duration-300 ${done ? 'text-ink-soft/70 line-through decoration-ink/30' : active ? 'font-semibold text-ink' : 'text-ink-soft/45'}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-ink/30 bg-paper" aria-hidden>
        <div className="sweep h-full w-1/4 rounded-full bg-gradient-to-r from-transparent via-coral to-transparent" />
      </div>
    </AiBubble>
  );
}

/* ============ 3 · friendly, actionable error state ============ */

export function ErrorMessage({
  error,
  onRetry,
  onFocusKey,
  canRetry,
}: {
  error: { code?: string; message: string };
  onRetry: () => void;
  onFocusKey: () => void;
  canRetry: boolean;
}) {
  const isKeyIssue = error.code === 'missing-key' || error.code === 'auth';
  const isRate = error.code === 'rate-limit';
  const headline =
    error.code === 'missing-key' ? 'DocLense needs a Groq API key'
    : error.code === 'auth' ? 'That key didn’t work'
    : isRate ? 'Groq rate limit hit'
    : error.code === 'no-text' ? 'That PDF seems to be a picture'
    : error.code === 'invalid-type' ? 'Unsupported file type'
    : error.code === 'too-large' ? 'File is too large'
    : error.code === 'empty-file' ? 'That file is empty'
    : 'Something went sideways';

  return (
    <ErrorBubble>
      <p className="text-[13.5px] font-extrabold leading-snug text-coral-deep">{headline}</p>
      <p className="mt-1 text-[12px] leading-snug text-ink">{error.message}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {isKeyIssue ? (
          <button
            onClick={onFocusKey}
            className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink"
          >
            <KeyRound size={12} strokeWidth={2.6} aria-hidden /> Open key field
          </button>
        ) : canRetry ? (
          <button
            onClick={onRetry}
            className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink"
          >
            <RefreshCw size={12} strokeWidth={2.6} aria-hidden /> Try again
          </button>
        ) : null}
        {isRate && (
          <button
            onClick={onRetry}
            className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-card px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink"
          >
            <RefreshCw size={12} strokeWidth={2.6} aria-hidden /> Retry now
          </button>
        )}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-ink/25 bg-card px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <TriangleAlert size={11} strokeWidth={2.4} aria-hidden /> Groq console ↗
        </a>
      </div>
    </ErrorBubble>
  );
}

/* ============ 4 · the analysis result — DocLense's main event ============ */

export interface AnalysisPayload {
  title: string;
  summary?: string;
  keyPoints?: string[];
  keywords?: string[];
  sentiment?: AnalysisResult['sentiment'];
  quiz?: AnalysisResult['quiz'];
  stats: DocStats;
  usage: UsageInfo | null;
  truncated: boolean;
  meta: FileMeta;
  summaryStyleLabel: string;
}

const SENTIMENT_META: Record<string, { chip: string; face: string }> = {
  Positive: { chip: 'bg-leaf text-white border-ink', face: '😄' },
  Neutral: { chip: 'bg-skyc text-white border-ink', face: '😐' },
  Negative: { chip: 'bg-coral text-white border-ink', face: '😟' },
  Mixed: { chip: 'bg-[#8b5cf6] text-white border-ink', face: '🎭' },
};

export function SentimentGauge({ score }: { score: number }) {
  // score: -1 … +1 → marker 4%…96%
  const pos = 4 + ((score + 1) / 2) * 92;
  return (
    <div className="relative mt-3 pb-4" aria-hidden>
      <div className="h-2.5 w-full rounded-full border border-ink bg-gradient-to-r from-coral-deep via-amber to-leaf" />
      <div
        className="absolute top-1/2 h-4.5 w-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-card hard-xs"
        style={{ left: `${pos}%`, height: 18, width: 18 }}
      />
      <div className="absolute inset-x-0 top-full flex justify-between font-mono text-[8px] font-bold uppercase tracking-widest text-ink-soft">
        <span>− Negative</span>
        <span>Neutral</span>
        <span>Positive +</span>
      </div>
    </div>
  );
}

export function AnalysisMessage({
  data,
  onDownload,
  onRegenerate,
  onAdjustOptions,
  quizProps,
}: {
  data: AnalysisPayload;
  onDownload: () => void;
  onRegenerate: () => void;
  onAdjustOptions: () => void;
  quizProps: {
    answers: Record<number, number>;
    submitted: boolean;
    onChoose: (q: number, option: number) => void;
    onSubmit: () => void;
    onRetryQuiz: () => void;
    onRegenerate: () => void;
    regenerating: boolean;
    score: { correct: number; total: number } | null;
  };
}) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(true);

  const copy = async (text: string, which: 'title' | 'summary') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'title') { setCopiedTitle(true); window.setTimeout(() => setCopiedTitle(false), 1600); }
      else { setCopiedSummary(true); window.setTimeout(() => setCopiedSummary(false), 1600); }
    } catch {
      /* clipboard blocked */
    }
  };

  const sentiment = data.sentiment ? (SENTIMENT_META[data.sentiment.label] ?? SENTIMENT_META.Neutral) : null;
  const stats = data.stats;
  const statItems = [
    { icon: WholeWord, value: formatNumber(stats.words), label: 'words' },
    { icon: Type, value: formatNumber(stats.characters), label: 'characters' },
    { icon: Timer, value: formatReadingTime(stats.readingTimeSec), label: 'read time' },
    { icon: AlignLeft, value: formatNumber(stats.sentences), label: 'sentences' },
    { icon: Pilcrow, value: formatNumber(stats.paragraphs), label: 'paragraphs' },
    { icon: Hash, value: formatNumber(stats.uniqueWords), label: 'unique words' },
  ];

  return (
    <AiBubble id="analysis-anchor">
      <div className="w-[min(560px,calc(100vw-118px))]">
        {/* ---------- warm intro line + action controls ---------- */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/15 pb-2.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold italic text-ink-soft">
            <Feather size={13} strokeWidth={2.3} className="text-coral" aria-hidden />
            Fresh off the LPU — here’s the full read on <span className="font-mono not-italic text-ink">{data.meta.name}</span>
            {data.truncated && <span className="not-italic">(first 14K chars)</span>}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRegenerate}
              title="Regenerate the entire response for this document"
              aria-label="Regenerate response"
              className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-ink transition-transform hover:scale-105"
            >
              <RefreshCw size={12} strokeWidth={2.6} /> Regenerate
            </button>
            <button
              onClick={onAdjustOptions}
              title="Change what sections to generate"
              aria-label="Adjust sections"
              className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-card px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-ink transition-transform hover:scale-105"
            >
              <SlidersHorizontal size={12} strokeWidth={2.5} /> Options
            </button>
          </div>
        </div>

        {/* ============ SUGGESTED TITLE ============ */}
        <AnalysisCard title="Suggested title" icon={<PenLine size={11} strokeWidth={2.6} />} accent="#ffb43a" pad={false}
          right={
            <button
              onClick={() => copy(data.title, 'title')}
              aria-label="Copy suggested title"
              title="Copy title"
              className="rounded-md border border-ink/40 bg-card/70 p-1 text-ink transition-colors hover:bg-card"
            >
              {copiedTitle ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2.4} />}
            </button>
          }>
          <p className="font-display px-4 pb-3.5 pt-2.5 text-[19px] font-black leading-snug tracking-tight text-ink">“{data.title}”</p>
        </AnalysisCard>

        {/* ============ SUMMARY ============ */}
        {data.summary && (
          <div className="mt-2.5">
            <AnalysisCard
              title={`Summary · ${data.summaryStyleLabel}`}
              icon={<AlignLeft size={11} strokeWidth={2.6} />}
              accent="#ff8a6b"
              pad={false}
              right={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copy(data.summary!, 'summary')}
                    aria-label="Copy summary"
                    title="Copy summary"
                    className="rounded-md border border-ink/40 bg-card/70 p-1 text-ink transition-colors hover:bg-card"
                  >
                    {copiedSummary ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2.4} />}
                  </button>
                  <button
                    onClick={onDownload}
                    aria-label="Download summary as .txt file"
                    title="Download .txt"
                    className="flex items-center gap-1 rounded-md border border-ink bg-ink px-1.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-amber transition-transform hover:scale-105"
                  >
                    <Download size={11} strokeWidth={2.6} /> .txt
                  </button>
                </div>
              }>
              <div className="px-4 pb-3.5 pt-2.5">
                <AIMarkdown text={data.summary} />
              </div>
            </AnalysisCard>
          </div>
        )}

        {/* ============ KEY POINTS ============ */}
        {data.keyPoints && data.keyPoints.length > 0 && (
          <div className="mt-2.5">
            <AnalysisCard
              title={`Key points · ${data.keyPoints.length}`}
              icon={<ListChecks size={11} strokeWidth={2.6} />}
              accent="#8be0b3"
              pad={false}
              right={
                <button onClick={() => setPointsOpen((v) => !v)} aria-expanded={pointsOpen} aria-label="Toggle key points" className="rounded-md border border-ink/40 bg-card/70 p-1 text-ink transition-colors hover:bg-card">
                  <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform duration-200 ${pointsOpen ? 'rotate-180' : ''}`} />
                </button>
              }>
              {pointsOpen && (
                <ol className="space-y-2 px-4 pb-3.5 pt-2.5">
                  {data.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-ink bg-amber font-mono text-[10px] font-bold leading-none text-ink">{i + 1}</span>
                      <span className="text-[12.5px] leading-snug text-ink">{point}</span>
                    </li>
                  ))}
                </ol>
              )}
            </AnalysisCard>
          </div>
        )}

        {/* ============ KEYWORDS ============ */}
        {data.keywords && data.keywords.length > 0 && (
          <div className="mt-2.5">
            <AnalysisCard title="Keywords" icon={<KeyRound size={11} strokeWidth={2.6} />} accent="#b3d4ff">
              <ul className="flex flex-wrap gap-1.5">
                {data.keywords.map((kw) => (
                  <li
                    key={kw}
                    className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-mono text-[10px] font-semibold tracking-tight text-ink transition-colors hover:bg-amber/40"
                  >
                    #{kw.toLowerCase().replace(/\s+/g, '-')}
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          </div>
        )}

        {/* ============ SENTIMENT ============ */}
        {data.sentiment && sentiment && (
          <div className="mt-2.5">
            <AnalysisCard
              title="Sentiment"
              icon={<ScanSearch size={11} strokeWidth={2.6} />}
              accent="#ffd3ad"
              right={
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink/80">conf. {Math.round(data.sentiment.confidence * 100)}%</span>
              }>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-card text-[24px] hard-xs" role="img" aria-label={`${data.sentiment.label} sentiment`}>
                  {sentiment.face}
                </span>
                <div className="min-w-0">
                  <span className={`inline-block rounded-lg border-2 px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] ${sentiment.chip}`}>
                    {data.sentiment.label}
                  </span>
                  <p className="mt-1 font-mono text-[10px] font-semibold text-ink-soft">score: {data.sentiment.score >= 0 ? '+' : ''}{data.sentiment.score.toFixed(2)} / 1.00</p>
                </div>
              </div>
              <SentimentGauge score={data.sentiment.score} />
              <p className="mt-1.5 border-t border-dashed border-ink/20 pt-2 text-[11px] leading-snug text-ink-soft">{data.sentiment.explanation}</p>
            </AnalysisCard>
          </div>
        )}

        {/* ============ DOCUMENT STATS ============ */}
        <div className="mt-2.5">
          <AnalysisCard title="Document stats" icon={<BarChart3 size={11} strokeWidth={2.6} />} accent="#e3d5ff">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {statItems.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-lg border border-ink/25 bg-paper px-1.5 py-2 text-center">
                  <Icon size={13} strokeWidth={2.2} className="mx-auto mb-1 text-coral" aria-hidden />
                  <p className="font-mono text-[11px] font-bold leading-none text-ink">{value}</p>
                  <p className="mt-1 font-mono text-[7.5px] font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] font-semibold text-ink-soft">
              <span className="flex items-center gap-1"><BookOpenCheck size={10} strokeWidth={2.5} aria-hidden /> Grade {stats.readingGrade ?? '—'} reading level</span>
              <span className="flex items-center gap-1"><Type size={10} strokeWidth={2.5} aria-hidden /> {formatNumber(stats.charactersNoSpaces)} chars (no spaces)</span>
              {data.usage?.latencyMs != null && <span className="flex items-center gap-1"><Gauge size={10} strokeWidth={2.5} aria-hidden /> {(data.usage.latencyMs / 1000).toFixed(1)}s on Groq</span>}
              {data.usage?.totalTokens != null && <span className="flex items-center gap-1"><Hash size={10} strokeWidth={2.5} aria-hidden /> {formatNumber(data.usage.totalTokens)} tokens</span>}
            </div>
          </AnalysisCard>
        </div>

        {/* ============ QUIZ ============ */}
        {data.quiz && data.quiz.length > 0 && (
          <div className="mt-2.5">
            <AnalysisCard
              title={`Quick quiz · ${data.quiz.length} questions`}
              icon={<ListTodo size={11} strokeWidth={2.6} />}
              accent="#ffc9e3"
              right={
                quizProps.submitted && quizProps.score ? (
                  <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
                    <CircleCheck size={11} strokeWidth={2.8} className="text-leaf" aria-hidden />
                    {quizProps.score.correct}/{quizProps.score.total} correct
                  </span>
                ) : undefined
              }>
              <QuizCard
                questions={data.quiz}
                answers={quizProps.answers}
                submitted={quizProps.submitted}
                onChoose={quizProps.onChoose}
                onSubmit={quizProps.onSubmit}
                onRetry={quizProps.onRetryQuiz}
                onRegenerate={quizProps.onRegenerate}
                regenerating={quizProps.regenerating}
              />
            </AnalysisCard>
          </div>
        )}

        {/* ============ BOTTOM REGENERATE & EXPORT BAR ============ */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border-2 border-ink bg-cream p-3 shadow-[2px_2px_0_0_#1d1e28]">
          <div>
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-ink-soft">Finished reading?</p>
            <p className="text-[12px] font-extrabold text-ink">Re-run analysis or customize options</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRegenerate}
              title="Re-run analysis on this document"
              className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-ink"
            >
              <RefreshCw size={12} strokeWidth={2.8} /> Regenerate
            </button>
            <button
              onClick={onAdjustOptions}
              title="Change section checkboxes"
              className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-card px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-ink"
            >
              <SlidersHorizontal size={12} strokeWidth={2.5} /> Options
            </button>
            <button
              onClick={onDownload}
              title="Download text summary"
              className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-ink px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber"
            >
              <Download size={12} strokeWidth={2.8} /> .txt
            </button>
          </div>
        </div>
      </div>
    </AiBubble>
  );
}

/* ============ 5 · tiny helper chips ============ */

export function TruncationNote() {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-[#8a5b00]">
      <CircleAlert size={10} strokeWidth={2.5} aria-hidden /> Long document — DocLense read the first 14,000 characters.
    </p>
  );
}
