import { useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ChatFeed from './components/ChatFeed';
import { ToastStack, useToasts } from './components/Toast';
import { extractTextFromFile, computeStats, formatReadingTime } from './lib/extract';
import {
  analyzeDocument,
  buildSummaryText,
  DEFAULT_ANALYSIS_OPTIONS,
  generateQuiz,
} from './lib/analysis';
import {
  askAboutDocument,
  clearApiKey,
  DEFAULT_MODEL,
  GROQ_MODELS,
  groqChat,
  resolveApiKey,
  saveApiKey,
} from './lib/groq';
import { sanitizeFilename, type SampleDoc } from './lib/samples';
import {
  DocError,
  GroqError,
  type AnalysisOptions,
  type ChatTurn,
  type DocStats,
  type FileMeta,
  type Settings,
  type SummaryStyle,
} from './lib/types';
import type { AnalysisPayload, Phase } from './components/MessageBlocks';

const ENV_KEY = ((import.meta.env.VITE_GROQ_API_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_GROQ_API_KEY as string | undefined) ??
  '').trim();

const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL,
  temperature: 0.4,
  maxTokens: 2048,
  summaryStyle: 'concise' as SummaryStyle,
  quizCount: 5,
};

const STYLE_LABELS: Record<SummaryStyle, string> = {
  concise: 'Concise',
  executive: 'Executive',
  detailed: 'Detailed',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('docent.settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      model: GROQ_MODELS.some((m) => m.id === parsed.model) ? String(parsed.model) : DEFAULT_MODEL,
      temperature: clamp(Number(parsed.temperature ?? DEFAULT_SETTINGS.temperature), 0, 1.5),
      maxTokens: clamp(Math.round(Number(parsed.maxTokens ?? DEFAULT_SETTINGS.maxTokens)), 256, 4096),
      summaryStyle: (['concise', 'executive', 'detailed'] as SummaryStyle[]).includes(parsed.summaryStyle as SummaryStyle)
        ? (parsed.summaryStyle as SummaryStyle)
        : 'concise',
      quizCount: [3, 5, 7, 10].includes(Number(parsed.quizCount)) ? Number(parsed.quizCount) : 5,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
const clamp = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);

interface DocState {
  text: string;
  meta: FileMeta;
  isSample: boolean;
  stats: DocStats;
}

export default function App() {
  const { toasts, push: pushToast, dismiss } = useToasts();

  /* ---------------- settings & key ---------------- */
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>(() => {
    try {
      const saved = localStorage.getItem('docent.options');
      if (saved) return { ...DEFAULT_ANALYSIS_OPTIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_ANALYSIS_OPTIONS;
  });

  const [keyInput, setKeyInput] = useState<string>(() => (ENV_KEY ? '' : resolveApiKey().key ?? ''));
  const [remember, setRemember] = useState(true);
  const keyEnvLocked = ENV_KEY.length > 0;
  const keySource: 'env' | 'session' | 'local' | null = keyEnvLocked ? 'env' : resolveApiKey().source;
  const effectiveKey = keyEnvLocked ? ENV_KEY : keyInput.trim();
  const keyReady = effectiveKey.length > 0;

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sessionTokens, setSessionTokens] = useState(0);

  /* ---------------- workspace ---------------- */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [doc, setDoc] = useState<DocState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [busyStep, setBusyStep] = useState(0);

  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);

  /* ---------------- persist settings & options ---------------- */
  useEffect(() => {
    try {
      localStorage.setItem('docent.settings', JSON.stringify(settings));
    } catch {
      /* quota/private mode */
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('docent.options', JSON.stringify(analysisOptions));
    } catch {
      /* quota/private mode */
    }
  }, [analysisOptions]);

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  /* ---------------- busy step rotation ---------------- */
  useEffect(() => {
    if (phase !== 'analyzing') return;
    setBusyStep(0);
    const id = window.setInterval(() => {
      setBusyStep((s) => Math.min(s + 1, 4));
    }, 950);
    return () => window.clearInterval(id);
  }, [phase]);

  /* ---------------- core: run the analysis ---------------- */
  const runAnalysis = useCallback(
    async (text: string, meta: FileMeta, isSample: boolean, opts: AnalysisOptions = analysisOptions) => {
      const stats = computeStats(text);
      setDoc({ text, meta, isSample, stats });
      setPhase('analyzing');
      setError(null);
      setAnalysis(null);
      setChatTurns([]);
      setChatInput('');
      setQuizAnswers({});
      setQuizSubmitted(false);

      try {
        const { analysis: insights, quiz, usage, truncated } = await analyzeDocument(
          effectiveKey || null,
          text,
          settings,
          opts
        );
        if (usage.totalTokens) setSessionTokens((t) => t + (usage.totalTokens ?? 0));
        setAnalysis({
          ...insights,
          quiz,
          stats,
          usage,
          truncated,
          meta,
          summaryStyleLabel: STYLE_LABELS[settings.summaryStyle],
        });
        setPhase('done');
        pushToast({
          kind: 'success',
          title: 'Document analyzed',
          message: `${meta.name} → ${stats.words.toLocaleString()} words read in ${(usage.latencyMs / 1000).toFixed(1)}s.`,
        });
      } catch (err) {
        const code = err instanceof DocError || err instanceof GroqError ? err.code : 'unknown';
        const message = err instanceof Error ? err.message : 'Unexpected failure during analysis.';
        setError({ code, message });
        setPhase('error');
        pushToast({ kind: 'error', title: 'Analysis failed', message: message.slice(0, 140) });
      }
    },
    [effectiveKey, settings, analysisOptions, pushToast]
  );

  /* ---------------- file & sample entry points ---------------- */
  const handleFile = useCallback(
    async (file: File) => {
      try {
        const { text, meta } = await extractTextFromFile(file);
        const stats = computeStats(text);
        setDoc({ text, meta, isSample: false, stats });
        setPhase('configuring');
        setError(null);
        setAnalysis(null);
        setChatTurns([]);
        setChatInput('');
        setQuizAnswers({});
        setQuizSubmitted(false);
        pushToast({
          kind: 'info',
          title: 'Document loaded',
          message: `${meta.name} ready — select what you want to generate.`,
        });
      } catch (err) {
        setPhase('error');
        setDoc(null);
        setAnalysis(null);
        const code = err instanceof DocError ? err.code : 'unreadable';
        const message = err instanceof Error ? err.message : 'That file could not be processed.';
        setError({ code, message });
        pushToast({ kind: 'error', title: 'Upload didn’t work', message: message.slice(0, 140) });
      }
    },
    [pushToast]
  );

  const handleSample = useCallback(
    (sample: SampleDoc) => {
      const meta: FileMeta = {
        name: sample.name,
        sizeBytes: new Blob([sample.content]).size,
        kind: 'text',
      };
      const stats = computeStats(sample.content);
      setDoc({ text: sample.content, meta, isSample: true, stats });
      setPhase('configuring');
      setError(null);
      setAnalysis(null);
      setChatTurns([]);
      setChatInput('');
      setQuizAnswers({});
      setQuizSubmitted(false);
      pushToast({
        kind: 'info',
        title: `Loaded “${sample.label}”`,
        message: 'Select what sections you want Docent to generate.',
      });
    },
    [pushToast]
  );

  /* ---------------- clear workspace ---------------- */
  const clearAll = useCallback(() => {
    setPhase('idle');
    setDoc(null);
    setAnalysis(null);
    setError(null);
    setChatTurns([]);
    setChatInput('');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setBusyStep(0);
    pushToast({ kind: 'info', title: 'Workspace cleared', message: 'Drop a fresh file whenever you’re ready.' });
  }, [pushToast]);

  /* ---------------- start / regenerate analysis ---------------- */
  const handleStartAnalysis = useCallback(() => {
    if (doc) void runAnalysis(doc.text, doc.meta, doc.isSample, analysisOptions);
  }, [doc, runAnalysis, analysisOptions]);

  const handleRegenerate = useCallback(() => {
    if (doc) void runAnalysis(doc.text, doc.meta, doc.isSample, analysisOptions);
  }, [doc, runAnalysis, analysisOptions]);

  const handleAdjustOptions = useCallback(() => {
    setPhase('configuring');
  }, []);

  const retryAnalysis = useCallback(() => {
    if (doc) void runAnalysis(doc.text, doc.meta, doc.isSample, analysisOptions);
  }, [doc, runAnalysis, analysisOptions]);

  /* ---------------- chat ---------------- */
  const sendChat = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || chatBusy || !doc) return;
      setChatInput('');
      setChatTurns((t) => [...t, { id: `u-${Date.now()}`, role: 'user', content: question }]);
      setChatBusy(true);
      try {
        const { content, usage } = await askAboutDocument(
          effectiveKey || null,
          doc.text,
          question,
          chatTurns,
          { model: settings.model, temperature: Math.min(settings.temperature, 1), maxTokens: Math.min(settings.maxTokens, 1200), timeoutMs: 60_000 }
        );
        if (usage.totalTokens) setSessionTokens((t) => t + (usage.totalTokens ?? 0));
        setChatTurns((t) => [...t, { id: `a-${Date.now()}`, role: 'assistant', content: content.trim() || 'Hmm — empty answer. Try rephrasing?' }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setChatTurns((t) => [...t, { id: `e-${Date.now()}`, role: 'assistant', content: message, isError: true }]);
      } finally {
        setChatBusy(false);
      }
    },
    [chatBusy, chatTurns, doc, effectiveKey, settings.model, settings.maxTokens, settings.temperature]
  );

  /* ---------------- download summary ---------------- */
  const downloadSummary = useCallback(() => {
    if (!analysis) return;
    const text = buildSummaryText(analysis);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc ? sanitizeFilename(doc.meta.name) : 'document'}-docent-summary.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast({ kind: 'success', title: 'Summary downloaded', message: a.download });
  }, [analysis, doc, pushToast]);

  /* ---------------- quiz ---------------- */
  const handleQuizChoose = useCallback(
    (q: number, option: number) => {
      if (quizSubmitted) return;
      setQuizAnswers((prev) => ({ ...prev, [q]: option }));
    },
    [quizSubmitted]
  );

  const handleQuizSubmit = useCallback(() => {
    if (!analysis || !analysis.quiz) return;
    setQuizSubmitted(true);
    const correct = analysis.quiz.reduce((acc, q, i) => acc + (quizAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const total = analysis.quiz.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    pushToast({
      kind: pct >= 60 ? 'success' : 'info',
      title: `Quiz scored: ${correct}/${total} (${pct}%)`,
      message: pct === 100 ? 'Perfect score! 🏆' : pct >= 60 ? 'Nice work — the summary above has the rest.' : 'Re-read the summary and retry the quiz.',
    });
  }, [analysis, quizAnswers, pushToast]);

  const handleQuizRetry = useCallback(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, []);

  const handleQuizRegenerate = useCallback(async () => {
    if (!doc || regeneratingQuiz) return;
    setRegeneratingQuiz(true);
    try {
      const { quiz, usage } = await generateQuiz(effectiveKey || null, doc.text, settings);
      if (!quiz.length) {
        pushToast({ kind: 'error', title: 'Quiz came back empty', message: 'The model returned unusable questions — try again or raise Max Tokens.' });
      } else {
        setAnalysis((prev) => (prev ? { ...prev, quiz } : prev));
        setQuizAnswers({});
        setQuizSubmitted(false);
        if (usage?.totalTokens) setSessionTokens((t) => t + (usage.totalTokens ?? 0));
        pushToast({ kind: 'success', title: 'Fresh quiz ready', message: `${quiz.length} new questions from the same document.` });
      }
    } catch (err) {
      pushToast({ kind: 'error', title: 'Couldn’t regenerate quiz', message: err instanceof Error ? err.message.slice(0, 140) : 'Unknown error' });
    } finally {
      setRegeneratingQuiz(false);
    }
  }, [doc, regeneratingQuiz, effectiveKey, settings, pushToast]);

  /* ---------------- API key actions ---------------- */
  const saveKey = useCallback(() => {
    const k = keyInput.trim();
    if (!k) return;
    saveApiKey(k, remember);
    setTestResult(null);
    pushToast({
      kind: k.startsWith('gsk_') ? 'success' : 'info',
      title: k.startsWith('gsk_') ? 'Groq key saved' : 'Key saved (unusual format)',
      message: k.startsWith('gsk_')
        ? `Stored ${remember ? 'on this device' : 'for this session only'}. Ready to analyze.`
        : 'Saved — Groq keys usually start with “gsk_”. Give it a test if analysis fails.',
    });
  }, [keyInput, remember, pushToast]);

  const forgetKey = useCallback(() => {
    clearApiKey();
    setKeyInput('');
    setTestResult(null);
    pushToast({ kind: 'info', title: 'Key forgotten', message: 'The stored key was removed from this browser.' });
  }, [pushToast]);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const started = performance.now();
      const { content } = await groqChat(
        effectiveKey || null,
        [
          { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
          { role: 'user', content: 'ping' },
        ],
        { model: settings.model, temperature: 0, maxTokens: 32, timeoutMs: 20_000 }
      );
      const ms = Math.round(performance.now() - started);
      const trimmed = content.trim();
      const ok = trimmed.toUpperCase().includes('OK') || !content;
      setTestResult({
        ok,
        message: ok ? `Groq responded in ${ms}ms — you’re wired up!` : `Responded (${ms}ms), but said “${content.trim().slice(0, 40)}”. Should still work.`,
      });
      pushToast({ kind: 'success', title: 'Groq is reachable', message: `Round-trip ${ms}ms via ${settings.model.split('/').pop()}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setTestResult({ ok: false, message: message.slice(0, 180) });
      pushToast({ kind: 'error', title: 'Connection failed', message: message.slice(0, 140) });
    } finally {
      setIsTesting(false);
    }
  }, [effectiveKey, settings.model, pushToast]);

  const focusKey = useCallback(() => {
    setSidebarOpen(true);
    window.setTimeout(() => {
      const candidates = Array.from(document.querySelectorAll<HTMLInputElement>('input[id^="groq-key"]'));
      const visible = candidates.find((el) => el.offsetParent !== null) ?? candidates[0];
      visible?.focus();
      visible?.select();
    }, 150);
  }, []);

  /* ---------------- derived ---------------- */
  const readingHint = useMemo(
    () => (doc ? `${doc.stats.words.toLocaleString()} words · ${formatReadingTime(doc.stats.readingTimeSec)} read` : ''),
    [doc]
  );

  const sidebar = (idSuffix: string, collapsed: boolean) => (
    <Sidebar
      settings={settings}
      onSettingsChange={patchSettings}
      keyInput={keyInput}
      keySource={keySource}
      envLocked={keyEnvLocked}
      onKeyInput={(v) => { setKeyInput(v); setTestResult(null); }}
      onSaveKey={saveKey}
      onForgetKey={forgetKey}
      remember={remember}
      onRememberChange={setRemember}
      onTestConnection={testConnection}
      isTesting={isTesting}
      testResult={testResult}
      sessionTokens={sessionTokens}
      collapsed={collapsed}
      onToggle={() => setSidebarOpen((v) => !v)}
      idSuffix={idSuffix}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <TopBar
        keyReady={keyReady}
        onClear={clearAll}
        onOpenSidebar={() => setSidebarOpen((v) => !v)}
        sidebarVisible={sidebarOpen}
        canRegenerate={phase === 'done' && !!doc}
        onRegenerate={handleRegenerate}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* ------- desktop / tablet sidebar (collapsible rail) ------- */}
        <div className="hidden h-full md:block">{sidebar('', !sidebarOpen)}</div>

        {/* ------- mobile drawer + scrim ------- */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-30 md:hidden">
            <button aria-label="Close settings" onClick={() => setSidebarOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-ink/45 backdrop-blur-[2px]" />
            <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar('-mobile', false)}</div>
          </div>
        )}

        {/* ------- main stage ------- */}
        <main className="min-w-0 flex-1" aria-label="Document analysis workspace">
          <ChatFeed
            phase={phase}
            doc={doc}
            analysis={analysis}
            error={error}
            busyStep={busyStep}
            chatTurns={chatTurns}
            chatBusy={chatBusy}
            chatInput={chatInput}
            onChatInput={setChatInput}
            onSendChat={sendChat}
            onUploadFile={handleFile}
            onSample={handleSample}
            onRetryAnalysis={retryAnalysis}
            onRegenerateAnalysis={handleRegenerate}
            onAdjustOptions={handleAdjustOptions}
            options={analysisOptions}
            onOptionsChange={setAnalysisOptions}
            onStartAnalysis={handleStartAnalysis}
            summaryStyle={settings.summaryStyle}
            onSummaryStyleChange={(summaryStyle) => patchSettings({ summaryStyle })}
            quizCount={settings.quizCount}
            onQuizCountChange={(quizCount) => patchSettings({ quizCount })}
            onFocusKey={focusKey}
            onDownload={downloadSummary}
            quizState={{ answers: quizAnswers, submitted: quizSubmitted }}
            onQuizChoose={handleQuizChoose}
            onQuizSubmit={handleQuizSubmit}
            onQuizRetry={handleQuizRetry}
            onQuizRegenerate={handleQuizRegenerate}
            regeneratingQuiz={regeneratingQuiz}
            onClear={clearAll}
          />
        </main>
      </div>

      {/* reading-time ticker, bottom-left on xl screens */}
      {readingHint && (
        <div
          className="pointer-events-none absolute bottom-2 z-10 hidden font-mono text-[9px] font-semibold uppercase tracking-widest text-ink-soft/70 transition-all duration-300 xl:block"
          style={{ left: sidebarOpen ? 316 : 84 }}
        >
          {readingHint} · analyzed by Groq
        </div>
      )}

      {/* film grain */}
      <svg className="grain-layer" aria-hidden>
        <filter id="docent-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#docent-grain)" />
      </svg>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
