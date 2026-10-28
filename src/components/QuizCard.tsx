import { Check, X, RotateCcw, Sparkles, CircleCheck, Info, Lightbulb, Loader2 } from 'lucide-react';
import type { QuizQuestion } from '../lib/types';

interface QuizCardProps {
  questions: QuizQuestion[];
  answers: Record<number, number>;
  submitted: boolean;
  onChoose: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function scoreRing(pct: number) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const filled = c * (pct / 100);
  const color = pct === 100 ? '#1f9d6b' : pct >= 60 ? '#ffb43a' : '#ff4b33';
  return { c, filled, color };
}

export default function QuizCard({
  questions,
  answers,
  submitted,
  onChoose,
  onSubmit,
  onRetry,
  onRegenerate,
  regenerating,
}: QuizCardProps) {
  if (!questions.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-ink/30 bg-paper px-4 py-5 text-center">
        <p className="text-[12.5px] font-semibold text-ink">The quiz didn’t make it out of the oven this time.</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-soft">Everything else analyzed fine — only the questions failed. Give it another shot:</p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="hard-xs press mx-auto mt-3 flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink disabled:opacity-60"
        >
          {regenerating ? <Loader2 size={13} className="animate-spin" strokeWidth={2.6} /> : <Sparkles size={13} strokeWidth={2.6} />}
          {regenerating ? 'Writing questions…' : 'Generate quiz again'}
        </button>
      </div>
    );
  }

  const answeredCount = questions.filter((_, i) => answers[i] !== undefined).length;
  const total = questions.length;
  const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
  const pct = Math.round((correct / total) * 100);
  const allAnswered = answeredCount === total;

  if (submitted) {
    const { c, filled, color } = scoreRing(pct);
    const verdict =
      pct === 100 ? 'Flawless! You know this document inside out.'
      : pct >= 80 ? 'Excellent read — you caught the important stuff.'
      : pct >= 60 ? 'Solid. Skim the key points above to mop up the rest.'
      : pct >= 40 ? 'Getting there — the summary might help it stick.'
      : 'Tricky one! Give the summary another pass, then retry.';

    return (
      <div>
        {/* ---------- score hero ---------- */}
        <div className="flex items-center gap-4 rounded-xl border-2 border-ink bg-ink px-4 py-3.5 hard-sm">
          <div className="relative h-[76px] w-[76px] shrink-0" role="img" aria-label={`Quiz score: ${correct} out of ${total}`}>
            <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
              <circle cx="38" cy="38" r="30" fill="none" stroke="#3a3b4a" strokeWidth="9" />
              <circle
                cx="38" cy="38" r="30" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c - filled}
                style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[15px] font-bold leading-none text-paper">{pct}<span className="text-[9px] align-top">%</span></span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber">You scored</p>
            <p className="font-display text-[21px] font-black leading-tight text-paper">{correct} of {total}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-paper/75">{verdict}</p>
          </div>
        </div>

        {/* ---------- review ---------- */}
        <ol className="mt-3 space-y-2">
          {questions.map((q, qi) => {
            const chosen = answers[qi];
            const isCorrect = chosen === q.correctIndex;
            return (
              <li key={qi} className="overflow-hidden rounded-xl border-2 border-ink bg-paper">
                <div className="flex items-start gap-2 px-3 pt-2.5">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-ink font-mono text-[9.5px] font-bold ${isCorrect ? 'bg-leaf text-white' : 'bg-coral text-white'}`}>
                    {isCorrect ? <Check size={11} strokeWidth={3.4} /> : <X size={11} strokeWidth={3.4} />}
                  </span>
                  <p className="text-[12px] font-bold leading-snug text-ink"><span className="font-mono text-[10px] text-ink-soft">Q{qi + 1}.</span> {q.question}</p>
                </div>
                <div className="px-3 pb-2 pl-10 pt-1.5">
                  <p className="text-[11px] leading-snug">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-leaf">Correct · </span>
                    <span className="text-ink">{LETTERS[q.correctIndex]}) {q.options[q.correctIndex]}</span>
                  </p>
                  {!isCorrect && chosen !== undefined && (
                    <p className="mt-0.5 text-[11px] leading-snug">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-coral">You picked · </span>
                      <span className="text-ink-soft line-through decoration-coral/50">{LETTERS[chosen]}) {q.options[chosen]}</span>
                    </p>
                  )}
                  <p className="mt-1 flex items-start gap-1 rounded-md bg-[#fff8e3] px-2 py-1 text-[10px] leading-snug text-[#6b5200]">
                    <Lightbulb size={10} strokeWidth={2.6} className="mt-0.5 shrink-0" aria-hidden /> {q.explanation}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={onRetry} className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-card px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink">
            <RotateCcw size={12} strokeWidth={2.6} aria-hidden /> Retry these questions
          </button>
          <button onClick={onRegenerate} disabled={regenerating} className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-ink disabled:opacity-60">
            {regenerating ? <Loader2 size={12} strokeWidth={2.6} className="animate-spin" aria-hidden /> : <Sparkles size={12} strokeWidth={2.6} aria-hidden />}
            {regenerating ? 'Writing new set…' : 'Fresh questions'}
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- quiz in progress ---------------- */
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ink-soft">Pick one answer per question</p>
        <span className="rounded-full border border-ink/30 bg-paper px-2 py-0.5 font-mono text-[9.5px] font-bold text-ink">{answeredCount}/{total}</span>
      </div>

      {/* progress track */}
      <div className="mb-3 flex gap-1" aria-hidden>
        {questions.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full border border-ink/40 transition-colors duration-200 ${answers[i] !== undefined ? 'bg-amber' : 'bg-paper'}`} />
        ))}
      </div>

      <ol className="space-y-3.5">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={qi}>
              <p className="text-[12px] font-bold leading-snug text-ink">
                <span className="mr-1 font-mono text-[10px] font-bold text-coral">Q{qi + 1}.</span>{q.question}
              </p>
              <div className="mt-1.5 grid gap-1.5" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((option, oi) => {
                  const active = chosen === oi;
                  return (
                    <button
                      key={oi}
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChoose(qi, oi)}
                      className={`group flex items-start gap-2 rounded-lg border-2 px-2.5 py-1.5 text-left transition-all duration-150 ${
                        active
                          ? 'hard-xs border-ink bg-ink text-paper'
                          : 'border-ink/20 bg-paper text-ink hover:-translate-y-px hover:border-ink hover:bg-white'
                      }`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border font-mono text-[9.5px] font-bold leading-none transition-colors ${
                        active ? 'border-amber bg-amber text-ink' : 'border-ink/40 bg-card text-ink group-hover:border-ink'
                      }`}>
                        {LETTERS[oi]}
                      </span>
                      <span className="text-[11.5px] leading-snug">{option}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t-2 border-dashed border-ink/20 pt-3">
        <p className="flex items-center gap-1 text-[10px] font-semibold text-ink-soft">
          <Info size={11} strokeWidth={2.5} aria-hidden /> Instant scoring, no judgment.
        </p>
        <button
          onClick={onSubmit}
          disabled={!allAnswered}
          className="hard-xs press flex items-center gap-1.5 rounded-lg border-2 border-ink bg-coral px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CircleCheck size={13} strokeWidth={2.7} aria-hidden />
          {allAnswered ? 'Score my answers' : `${total - answeredCount} to go`}
        </button>
      </div>
    </div>
  );
}
