import { groqChat } from './groq';
import {
  GroqError,
  type AnalysisOptions,
  type AnalysisResult,
  type QuizQuestion,
  type Sentiment,
  type SentimentLabel,
  type Settings,
  type SummaryStyle,
  type UsageInfo,
} from './types';

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  summary: true,
  keyPoints: true,
  keywords: true,
  sentiment: true,
  quiz: true,
};

export const MAX_ANALYSIS_CHARS = 14_000;
export const MAX_QUIZ_CHARS = 10_000;

const STYLE_INSTRUCTIONS: Record<SummaryStyle, string> = {
  concise: 'Summary style: CONCISE — 2 to 4 tight sentences, no fluff. Capture only the essential thesis and conclusion.',
  detailed: 'Summary style: DETAILED — 1 to 2 short paragraphs covering context, main arguments, evidence and conclusion.',
  executive:
    'Summary style: EXECUTIVE — C-suite brief. Lead with the bottom line, then implications, risks and recommended actions. Crisp, confident, jargon-free.',
};

function buildAnalysisSchema(options: AnalysisOptions): string {
  const parts: string[] = [
    '  "title": string            // ≤ 12 words, no quotes, title case, compelling and accurate',
  ];
  if (options.summary) {
    parts.push('  "summary": string          // 60-130 words, faithful to the document');
  }
  if (options.keyPoints) {
    parts.push('  "keyPoints": string[]      // 4 to 6 strings, each ≤ 22 words, no leading bullets/numbers');
  }
  if (options.keywords) {
    parts.push('  "keywords": string[]       // 8 to 12 single terms or short phrases (≤ 3 words each)');
  }
  if (options.sentiment) {
    parts.push(
      '  "sentiment": {\n    "label": "Positive" | "Neutral" | "Negative" | "Mixed",\n    "score": number,          // -1 (very negative) .. +1 (very positive)\n    "confidence": number,     // 0 .. 1\n    "explanation": string     // one sentence, ≤ 30 words\n  }'
    );
  }
  return `{\n${parts.join(',\n')}\n}`;
}

export function truncateForAnalysis(text: string): string {
  return text.length > MAX_ANALYSIS_CHARS ? text.slice(0, MAX_ANALYSIS_CHARS) : text;
}

/** Tolerant JSON extraction: strips fences, finds the outermost braces/brackets. */
function tolerantParse<T>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) throw new GroqError('parse', 'The model did not return JSON. Try again.');
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  const end = s.lastIndexOf(close);
  if (end <= start) throw new GroqError('parse', 'The model returned truncated JSON. Try increasing Max Tokens.');
  return JSON.parse(s.slice(start, end + 1)) as T;
}

function asStringArray(value: unknown, min: number, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .slice(0, max)
    .filter((s, i) => s.length > 1 || i < min);
}

const SENTIMENT_LABELS: SentimentLabel[] = ['Positive', 'Neutral', 'Negative', 'Mixed'];

function normalizeSentiment(raw: unknown): Sentiment {
  const obj = (raw ?? {}) as Record<string, unknown>;
  let label = String(obj.label ?? 'Neutral').trim();
  label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  if (!SENTIMENT_LABELS.includes(label as SentimentLabel)) label = 'Neutral';
  let score = Number(obj.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(-1, Math.min(1, score));
  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  if (confidence > 1) confidence = confidence / 100; // tolerate percentages
  confidence = Math.max(0, Math.min(1, confidence));
  const explanation = String(obj.explanation ?? '').trim() || 'Sentiment estimated from the overall tone of the document.';
  return { label: label as SentimentLabel, score, confidence, explanation };
}

function normalizeAnalysis(raw: unknown, options: AnalysisOptions): Omit<AnalysisResult, 'quiz'> {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const title = String(obj.title ?? '')
    .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
    .trim()
    .slice(0, 140) || 'Document Analysis';

  let summary: string | undefined = undefined;
  if (options.summary) {
    summary = String(obj.summary ?? '').trim();
    if (!summary) {
      summary = 'Summary could not be generated for this section.';
    }
  }

  let keyPoints: string[] | undefined = undefined;
  if (options.keyPoints) {
    keyPoints = asStringArray(obj.keyPoints ?? obj.key_points, 1, 6);
    if (!keyPoints.length) {
      keyPoints = ['Core points synthesized from the document.'];
    }
  }

  let keywords: string[] | undefined = undefined;
  if (options.keywords) {
    keywords = asStringArray(obj.keywords, 1, 12);
    if (!keywords.length) {
      keywords = ['document'];
    }
  }

  let sentiment: Sentiment | undefined = undefined;
  if (options.sentiment) {
    sentiment = normalizeSentiment(obj.sentiment);
  }

  return {
    title,
    summary,
    keyPoints,
    keywords,
    sentiment,
  };
}

function normalizeQuiz(raw: unknown, count: number): QuizQuestion[] {
  const container = raw as { quiz?: unknown[]; questions?: unknown[] } | unknown[] | null;
  const arr = Array.isArray(container)
    ? container
    : Array.isArray(container?.quiz)
      ? (container as { quiz: unknown[] }).quiz
      : Array.isArray(container?.questions)
        ? (container as { questions: unknown[] }).questions
        : [];
  const questions: QuizQuestion[] = [];
  for (const item of arr) {
    if (questions.length >= count) break;
    const q = (item ?? {}) as Record<string, unknown>;
    const question = String(q.question ?? '').trim();
    const options = asStringArray(q.options, 4, 4);
    if (!question || options.length !== 4) continue;
    let correctIndex = Number(q.correctIndex ?? q.correct_index ?? q.answer_index ?? q.answer);
    if (!Number.isFinite(correctIndex)) {
      const answerText = String(q.answer ?? q.correct_answer ?? '').trim().toLowerCase();
      correctIndex = options.findIndex((o) => o.trim().toLowerCase() === answerText);
    }
    correctIndex = Math.round(correctIndex);
    if (correctIndex < 0 || correctIndex > 3) continue;
    const explanation = String(q.explanation ?? '').trim() || 'See the document for details.';
    questions.push({ question, options, correctIndex, explanation });
  }
  return questions;
}

export interface AnalysisBundle {
  analysis: Omit<AnalysisResult, 'quiz'>;
  quiz: QuizQuestion[];
  usage: UsageInfo;
  truncated: boolean;
}

export async function analyzeDocument(
  apiKey: string | null,
  fullText: string,
  settings: Settings,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
  onStage?: (stage: 'insights' | 'quiz') => void
): Promise<AnalysisBundle> {
  const truncatedText = fullText.length > MAX_ANALYSIS_CHARS;
  const doc = truncateForAnalysis(fullText);

  const needsInsights = options.summary || options.keyPoints || options.keywords || options.sentiment;
  let insights: Omit<AnalysisResult, 'quiz'> = {
    title: 'Document Analysis',
  };
  let insightsUsage: UsageInfo = {
    model: settings.model,
    latencyMs: 0,
  };

  // ---------- Pass 1: insights (title, summary, points, keywords, sentiment) ----
  if (needsInsights) {
    onStage?.('insights');
    const schema = buildAnalysisSchema(options);
    const systemInstructions = [
      'You are Docent, an expert document analyst. Analyze the document and respond with ONE JSON object and nothing else.',
    ];
    if (options.summary) {
      systemInstructions.push(STYLE_INSTRUCTIONS[settings.summaryStyle]);
    }
    systemInstructions.push(
      'Be faithful to the document — never invent facts. If the document is short, scale the analysis down gracefully.',
      `Respond with exactly this JSON shape: ${schema}`
    );

    const insightsSystem = systemInstructions.join('\n');
    const insightsMaxTokens = Math.min(settings.maxTokens, 4096);
    const insightsCall = () =>
      groqChat(
        apiKey,
        [
          { role: 'system', content: insightsSystem },
          { role: 'user', content: `Analyze this document:\n\n"""\n${doc}\n"""` },
        ],
        { model: settings.model, temperature: settings.temperature, maxTokens: insightsMaxTokens, json: true, timeoutMs: 75_000 }
      );

    let insightsRes = await insightsCall();
    try {
      insights = normalizeAnalysis(tolerantParse(insightsRes.content), options);
    } catch (firstErr) {
      // One retry with a stricter reminder if the first pass produced malformed JSON.
      if (firstErr instanceof GroqError && (firstErr.code === 'parse' || firstErr.code === 'unknown')) {
        insightsRes = await insightsCall();
        insights = normalizeAnalysis(tolerantParse(insightsRes.content), options);
      } else {
        throw firstErr;
      }
    }
    insightsUsage = insightsRes.usage;
  } else {
    // Only quiz was requested; derive quick title from the first non-empty line
    const firstLine = fullText.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Document';
    insights.title = firstLine.replace(/^[#\s*_-]+|[#\s*_-]+$/g, '').slice(0, 100) || 'Document';
  }

  // ---------- Pass 2: quiz --------------------------------------------------
  let quiz: QuizQuestion[] = [];
  let quizUsage: UsageInfo | undefined;

  if (options.quiz) {
    onStage?.('quiz');
    const quizText = fullText.length > MAX_QUIZ_CHARS ? fullText.slice(0, MAX_QUIZ_CHARS) : fullText;
    const quizSystem = [
      'You are Docent, an expert quiz writer. Create a multiple-choice quiz that tests genuine comprehension of the DOCUMENT.',
      `Generate EXACTLY ${settings.quizCount} questions. Each question has exactly 4 options, exactly one correct.`,
      'Distractors must be plausible but clearly wrong to a careful reader. Cover different parts of the document; mix recall and inference.',
      'Respond with ONE JSON object and nothing else: {"questions": [{"question": string, "options": [string, string, string, string], "correctIndex": 0-3, "explanation": string}]}',
    ].join('\n');

    const quizMaxTokens = Math.min(Math.max(settings.maxTokens, 1200), 4096);
    try {
      const quizRes = await groqChat(
        apiKey,
        [
          { role: 'system', content: quizSystem },
          { role: 'user', content: `Write the quiz for this document:\n\n"""\n${quizText}\n"""` },
        ],
        { model: settings.model, temperature: Math.min(settings.temperature, 0.7), maxTokens: quizMaxTokens, json: true, timeoutMs: 75_000 }
      );
      quizUsage = quizRes.usage;
      quiz = normalizeQuiz(tolerantParse(quizRes.content), settings.quizCount);
    } catch (err) {
      // A failed quiz shouldn't sink the whole analysis — surface a gentle inline error instead.
      console.warn('Quiz generation failed:', err);
      quiz = [];
    }
  }

  // ---------- merge usage ----------------------------------------------------
  const p1 = insightsUsage.promptTokens ?? 0;
  const c1 = insightsUsage.completionTokens ?? 0;
  const p2 = quizUsage?.promptTokens ?? 0;
  const c2 = quizUsage?.completionTokens ?? 0;
  const usage: UsageInfo = {
    model: insightsUsage.model || settings.model,
    promptTokens: p1 + p2 || undefined,
    completionTokens: c1 + c2 || undefined,
    totalTokens: p1 + c1 + p2 + c2 || undefined,
    latencyMs: insightsUsage.latencyMs + (quizUsage?.latencyMs ?? 0),
  };

  return { analysis: insights, quiz, usage, truncated: truncatedText };
}

export async function generateQuiz(
  apiKey: string | null,
  fullText: string,
  settings: Settings
): Promise<{ quiz: QuizQuestion[]; usage: UsageInfo | null }> {
  const quizText = fullText.length > MAX_QUIZ_CHARS ? fullText.slice(0, MAX_QUIZ_CHARS) : fullText;
  const quizSystem = [
    'You are Docent, an expert quiz writer. Create a multiple-choice quiz that tests genuine comprehension of the DOCUMENT.',
    `Generate EXACTLY ${settings.quizCount} questions. Each question has exactly 4 options, exactly one correct.`,
    'Distractors must be plausible but clearly wrong to a careful reader. Cover different parts of the document; mix recall and inference.',
    'If asked to regenerate, produce a DIFFERENT, fresh set of questions from the same document.',
    'Respond with ONE JSON object and nothing else: {"questions": [{"question": string, "options": [string, string, string, string], "correctIndex": 0-3, "explanation": string}]}',
  ].join('\n');
  const res = await groqChat(
    apiKey,
    [
      { role: 'system', content: quizSystem },
      { role: 'user', content: `Write a fresh quiz for this document:\n\n"""\n${quizText}\n"""` },
    ],
    { model: settings.model, temperature: Math.min(settings.temperature, 0.7) + 0.15, maxTokens: Math.min(Math.max(settings.maxTokens, 1400), 4096), json: true, timeoutMs: 75_000 }
  );
  const quiz = normalizeQuiz(tolerantParse(res.content), settings.quizCount);
  return { quiz, usage: res.usage };
}

export function buildSummaryText(result: Omit<AnalysisResult, 'quiz'> & { quiz?: QuizQuestion[] }): string {
  const divider = '='.repeat(64);
  const lines: string[] = [
    divider,
    `  ${result.title}`,
    divider,
    '',
  ];

  if (result.summary) {
    lines.push('SUMMARY', '-------', result.summary, '');
  }

  if (result.keyPoints && result.keyPoints.length > 0) {
    lines.push('KEY POINTS', '----------', ...result.keyPoints.map((p, i) => `  ${i + 1}. ${p}`), '');
  }

  if (result.keywords && result.keywords.length > 0) {
    lines.push('KEYWORDS', '--------', result.keywords.join(', '), '');
  }

  if (result.sentiment) {
    const sentimentLine = `${result.sentiment.label} (score ${result.sentiment.score >= 0 ? '+' : ''}${result.sentiment.score.toFixed(2)}, confidence ${Math.round(result.sentiment.confidence * 100)}%)`;
    lines.push('SENTIMENT', '---------', sentimentLine, result.sentiment.explanation, '');
  }

  const quiz = result.quiz ?? [];
  if (quiz.length) {
    lines.push('QUIZ', '----');
    quiz.forEach((q, i) => {
      lines.push(`  Q${i + 1}. ${q.question}`);
      q.options.forEach((o, j) => lines.push(`      ${String.fromCharCode(65 + j)}) ${o}`));
      lines.push(`      ✓ Answer: ${String.fromCharCode(65 + q.correctIndex)}) ${q.options[q.correctIndex]}`);
      lines.push('');
    });
  }
  lines.push(divider, 'Generated by Docent · Powered by Groq');
  return lines.join('\n');
}
