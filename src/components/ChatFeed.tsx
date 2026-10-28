import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import {
  SendHorizonal,
  Sparkles,
  AlertTriangle,
  Wand2,
  MessageCircleQuestion,
  Crosshair,
  Scale,
  ListFilter,
  FileWarning,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import UploadZone from './UploadZone';
import type { SampleDoc } from '../lib/samples';
import type { AnalysisOptions, ChatTurn, DocStats, FileMeta, SummaryStyle } from '../lib/types';
import AIMarkdown from './AIMarkdown';
import { AiBubble, UserBubble } from './messages';
import {
  AnalysisMessage,
  BusyMessage,
  ConfigOptionsCard,
  ErrorMessage,
  FileMessage,
  type AnalysisPayload,
  type Phase,
} from './MessageBlocks';

const QUICK_PROMPTS = [
  { label: 'Explain it simpler', icon: Wand2 },
  { label: 'What’s the main takeaway?', icon: MessageCircleQuestion },
  { label: 'Why is the sentiment that way?', icon: Scale },
  { label: 'Top 3 keywords', icon: ListFilter },
  { label: 'What’s missing here?', icon: FileWarning },
];

export interface FeedProps {
  phase: Phase;
  doc: { text: string; meta: FileMeta; isSample: boolean; stats: DocStats } | null;
  analysis: AnalysisPayload | null;
  error: { code?: string; message: string } | null;
  busyStep: number;
  chatTurns: ChatTurn[];
  chatBusy: boolean;
  chatInput: string;
  onChatInput: (v: string) => void;
  onSendChat: (text: string) => void;
  onUploadFile: (file: File) => void;
  onSample: (sample: SampleDoc) => void;
  onRetryAnalysis: () => void;
  onRegenerateAnalysis: () => void;
  onAdjustOptions: () => void;
  options: AnalysisOptions;
  onOptionsChange: (options: AnalysisOptions) => void;
  onStartAnalysis: () => void;
  summaryStyle: SummaryStyle;
  onSummaryStyleChange: (s: SummaryStyle) => void;
  quizCount: number;
  onQuizCountChange: (c: number) => void;
  onFocusKey: () => void;
  onDownload: () => void;
  quizState: { answers: Record<number, number>; submitted: boolean };
  onQuizChoose: (q: number, option: number) => void;
  onQuizSubmit: () => void;
  onQuizRetry: () => void;
  onQuizRegenerate: () => void;
  regeneratingQuiz: boolean;
  onClear: () => void;
}

export default function ChatFeed({
  phase,
  doc,
  analysis,
  error,
  busyStep,
  chatTurns,
  chatBusy,
  chatInput,
  onChatInput,
  onSendChat,
  onUploadFile,
  onSample,
  onRetryAnalysis,
  onRegenerateAnalysis,
  onAdjustOptions,
  options,
  onOptionsChange,
  onStartAnalysis,
  summaryStyle,
  onSummaryStyleChange,
  quizCount,
  onQuizCountChange,
  onFocusKey,
  onDownload,
  quizState,
  onQuizChoose,
  onQuizSubmit,
  onQuizRetry,
  onQuizRegenerate,
  regeneratingQuiz,
  onClear,
}: FeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  /* ------- intelligent scrolling ------- */
  useEffect(() => {
    if (phase === 'done') {
      // Scroll to the top of the generated response right after the uploaded file
      const timer = window.setTimeout(() => {
        const anchor = document.getElementById('analysis-anchor');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
      return () => window.clearTimeout(timer);
    } else if (phase === 'configuring') {
      const timer = window.setTimeout(() => {
        const anchor = document.getElementById('config-anchor');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
      return () => window.clearTimeout(timer);
    } else if (phase === 'analyzing') {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [phase, analysis?.title]);

  /* ------- scroll to bottom for follow-up chat messages ------- */
  useEffect(() => {
    if (chatTurns.length > 0 || chatBusy) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatTurns.length, chatBusy]);

  /* ------- '/' shortcut focuses the composer ------- */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !inField && phase === 'done') {
        e.preventDefault();
        composerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    onSendChat(text);
  };

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  if (phase === 'idle') {
    return <UploadZone variant="hero" onFile={onUploadFile} onSample={onSample} busy={false} />;
  }

  const quizScore =
    phase === 'done' && analysis && analysis.quiz && quizState.submitted
      ? {
          correct: analysis.quiz.reduce((acc, q, i) => acc + (quizState.answers[i] === q.correctIndex ? 1 : 0), 0),
          total: analysis.quiz.length,
        }
      : null;

  return (
    <div className="dotgrid flex h-full min-h-0 flex-col">
      {/* ================= scrollable message feed ================= */}
      <div ref={scrollRef} className="nice-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-4 sm:px-5">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
          {/* 1 · the dropped file, as your first chat message */}
          {doc && <FileMessage meta={doc.meta} note={doc.isSample ? 'sample' : undefined} />}

          {/* 1.5 · choose options checklist (configuring state) */}
          {phase === 'configuring' && doc && (
            <ConfigOptionsCard
              meta={doc.meta}
              stats={doc.stats}
              options={options}
              onOptionsChange={onOptionsChange}
              onGenerate={onStartAnalysis}
              onCancel={onClear}
              summaryStyle={summaryStyle}
              onSummaryStyleChange={onSummaryStyleChange}
              quizCount={quizCount}
              onQuizCountChange={onQuizCountChange}
            />
          )}

          {/* 2 · analyzing… */}
          {phase === 'analyzing' && <BusyMessage stepIndex={busyStep} />}

          {/* 3 · error state */}
          {phase === 'error' && error && (
            <ErrorMessage error={error} onRetry={onRetryAnalysis} onFocusKey={onFocusKey} canRetry={!!doc} />
          )}

          {/* 4 · the full analysis */}
          {phase === 'done' && analysis && (
            <AnalysisMessage
              data={analysis}
              onDownload={onDownload}
              onRegenerate={onRegenerateAnalysis}
              onAdjustOptions={onAdjustOptions}
              quizProps={{
                answers: quizState.answers,
                submitted: quizState.submitted,
                onChoose: onQuizChoose,
                onSubmit: onQuizSubmit,
                onRetryQuiz: onQuizRetry,
                onRegenerate: onQuizRegenerate,
                regenerating: regeneratingQuiz,
                score: quizScore,
              }}
            />
          )}

          {/* 5 · follow-up chat turns */}
          {chatTurns.map((turn) =>
            turn.role === 'user' ? (
              <UserBubble key={turn.id}>
                <p className="text-[13px] leading-relaxed text-paper">{turn.content}</p>
              </UserBubble>
            ) : (
              <AiBubble key={turn.id}>
                {turn.isError ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} strokeWidth={2.4} className="mt-0.5 shrink-0 text-coral" aria-hidden />
                    <p className="text-[12.5px] leading-snug text-ink">{turn.content}</p>
                  </div>
                ) : (
                  <AIMarkdown text={turn.content} />
                )}
              </AiBubble>
            )
          )}

          {/* 6 · assistant typing… */}
          {chatBusy && (
            <AiBubble>
              <span className="flex items-center gap-1 py-1" aria-label="DocLense is thinking">
                <span className="dot h-2 w-2 rounded-full bg-coral" />
                <span className="dot h-2 w-2 rounded-full bg-amber" />
                <span className="dot h-2 w-2 rounded-full bg-leaf" />
              </span>
            </AiBubble>
          )}

          {/* 7 · compact dropzone — when ready for another file */}
          {(phase === 'done' || phase === 'error') && (
            <UploadZone variant="compact" onFile={onUploadFile} onSample={onSample} busy={chatBusy} />
          )}

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* ================= composer ================= */}
      {phase === 'done' && (
        <div className="shrink-0 border-t-2 border-ink bg-cream/95 px-3 pb-3 pt-2 backdrop-blur sm:px-5">
          <div className="mx-auto w-full max-w-[760px]">
            {/* quick prompt chips */}
            <div className="nice-scroll -mx-1 mb-1.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="list" aria-label="Quick questions">
              <button
                onClick={onRegenerateAnalysis}
                className="flex shrink-0 items-center gap-1 rounded-full border border-ink/40 bg-amber px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-ink transition-all hover:-translate-y-px"
                title="Regenerate the response for this document"
              >
                <RefreshCw size={11} strokeWidth={2.6} aria-hidden /> Regenerate
              </button>
              {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => onSendChat(label)}
                  disabled={chatBusy}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-ink/35 bg-card px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-ink-soft transition-all hover:-translate-y-px hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  <Icon size={11} strokeWidth={2.4} aria-hidden /> {label}
                </button>
              ))}
              <button
                onClick={onClear}
                className="flex shrink-0 items-center gap-1 rounded-full border border-coral/50 bg-[#ffe9e4] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-coral-deep transition-all hover:-translate-y-px"
              >
                <RotateCcw size={11} strokeWidth={2.4} aria-hidden /> Start over
              </button>
            </div>
            <form onSubmit={submit} className="flex items-end gap-2">
              <label htmlFor="composer" className="sr-only">Ask DocLense about this document</label>
              <div className="hard-sm flex min-h-[52px] flex-1 items-end rounded-2xl border-2 border-ink bg-card transition-shadow focus-within:shadow-[6px_6px_0_0_#ff4b33]">
                <Sparkles size={16} strokeWidth={2.2} className="mb-4 ml-3.5 shrink-0 text-amber" aria-hidden />
                <textarea
                  id="composer"
                  ref={composerRef}
                  value={chatInput}
                  rows={1}
                  placeholder="Ask anything about this document…  ( / )"
                  onChange={(e) => {
                    onChatInput(e.target.value);
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={onComposerKey}
                  disabled={chatBusy}
                  className="nice-scroll max-h-[140px] min-h-[48px] w-full resize-none bg-transparent px-2 py-3.5 text-[13px] leading-snug text-ink placeholder-ink/35 outline-none"
                />
                <kbd className="mb-3.5 mr-3 hidden shrink-0 rounded-md border border-ink/30 bg-paper px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-soft sm:block">Enter ↵</kbd>
              </div>
              <button
                type="submit"
                disabled={!chatInput.trim() || chatBusy}
                aria-label="Send question"
                title="Send (Enter)"
                className="hard-sm press grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border-2 border-ink bg-coral text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                <SendHorizonal size={21} strokeWidth={2.2} aria-hidden />
              </button>
            </form>
            <p className="mt-1.5 text-center font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-soft/70">
              <Crosshair size={8} strokeWidth={2.5} className="mr-1 inline" aria-hidden />Answers are grounded in your document · DocLense can make mistakes, check the source
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
