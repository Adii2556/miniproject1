import { GroqError, type ChatTurn, type UsageInfo } from './types';

// Current GroqCloud production model IDs, verified against console.groq.com/docs/models (Oct 2026).
export const GROQ_MODELS = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    tagline: 'Best quality',
    speed: 500,
    price: '$0.15 / $0.60 per 1M tok',
    context: '131K context',
    note: 'Recommended — Groq flagship, structured-output friendly',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    tagline: 'Fastest',
    speed: 1000,
    price: '$0.075 / $0.30 per 1M tok',
    context: '131K context',
    note: 'Cheapest and quickest for everyday documents',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    tagline: 'Classic versatile',
    speed: 280,
    price: 'on-demand',
    context: '131K context',
    note: 'The original workhorse from the README',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    tagline: 'Featherweight',
    speed: 560,
    price: 'on-demand',
    context: '131K context',
    note: 'Lightning fast, great for short notes & memos',
  },
] as const;

export const DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export function resolveApiKey(): { key: string | null; source: 'env' | 'session' | 'local' | null } {
  const envKey =
    (import.meta.env.VITE_GROQ_API_KEY as string | undefined) ??
    (import.meta.env.NEXT_PUBLIC_GROQ_API_KEY as string | undefined) ??
    '';
  if (envKey.trim()) return { key: envKey.trim(), source: 'env' };
  try {
    const s = sessionStorage.getItem('doclense.groq.key');
    if (s) return { key: s, source: 'session' };
    const l = localStorage.getItem('doclense.groq.key');
    if (l) return { key: l, source: 'local' };
  } catch {
    /* storage unavailable */
  }
  return { key: null, source: null };
}

export function saveApiKey(key: string, remember: boolean) {
  const k = key.trim();
  try {
    if (remember) {
      localStorage.setItem('doclense.groq.key', k);
      sessionStorage.removeItem('doclense.groq.key');
    } else {
      sessionStorage.setItem('doclense.groq.key', k);
      localStorage.removeItem('doclense.groq.key');
    }
  } catch {
    /* storage unavailable */
  }
}

export function clearApiKey() {
  try {
    localStorage.removeItem('doclense.groq.key');
    sessionStorage.removeItem('doclense.groq.key');
    localStorage.removeItem('doclense.settings');
  } catch {
    /* ignore */
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCallResult {
  content: string;
  usage: UsageInfo;
}

function mapHttpError(status: number, bodyText: string): GroqError {
  let apiMessage = '';
  try {
    const parsed = JSON.parse(bodyText);
    apiMessage = parsed?.error?.message ?? parsed?.message ?? '';
  } catch {
    apiMessage = bodyText.slice(0, 200);
  }
  switch (status) {
    case 400:
      return new GroqError(
        'bad-request',
        `Groq rejected the request: ${apiMessage || 'invalid parameters'}. Try lowering Max Tokens or temperature.`,
        400
      );
    case 401:
    case 403:
      return new GroqError(
        'auth',
        'Your Groq API key was rejected (invalid or unauthorized). Double-check it — keys start with “gsk_” and come from console.groq.com/keys.',
        status
      );
    case 404:
      return new GroqError(
        'bad-request',
        `That model ID wasn't found on Groq. Pick another model in the sidebar — the current lineup includes GPT-OSS 120B/20B and Llama 3.3.`,
        404
      );
    case 413:
      return new GroqError(
        'bad-request',
        'The document is too long for this model to process in one go. Try a shorter file or fewer pages.',
        413
      );
    case 429:
      return new GroqError(
        'rate-limit',
        'Rate limit reached (429). Groq’s free tier caps tokens per minute — wait a few seconds, or switch to GPT-OSS 20B for a cheaper footprint.',
        429
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return new GroqError(
        'server',
        `Groq is having a moment (HTTP ${status}). This is usually temporary — give it a few seconds and retry.`,
        status
      );
    default:
      return new GroqError('unknown', `Unexpected Groq error (HTTP ${status}). ${apiMessage}`.trim(), status);
  }
}

export interface GroqCallOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  json?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function groqChat(
  apiKey: string | null,
  messages: ChatMessage[],
  opts: GroqCallOptions
): Promise<GroqCallResult> {
  if (!apiKey) {
    throw new GroqError(
      'missing-key',
      'No Groq API key set. Paste your key (starts with gsk_) into the sidebar — or add VITE_GROQ_API_KEY to a .env.local file and restart.'
    );
  }
  const started = performance.now();
  const timeout = opts.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort('timeout'), timeout);
  const onExternalAbort = () => controller.abort('external');
  opts.signal?.addEventListener('abort', onExternalAbort);

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      top_p: 1,
      stream: false,
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw mapHttpError(response.status, errText);
    }

    const data = (await response.json().catch(() => {
      throw new GroqError('parse', 'Groq returned a response that wasn’t valid JSON. Please retry.');
    })) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const latencyMs = Math.round(performance.now() - started);
    return {
      content,
      usage: {
        model: data.model ?? opts.model,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        latencyMs,
      },
    };
  } catch (err) {
    if (err instanceof GroqError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (opts.signal?.aborted) throw new GroqError('unknown', 'The request was cancelled.');
      throw new GroqError(
        'network',
        `Groq took longer than ${Math.round(timeout / 1000)}s to respond. Check your connection, or try GPT-OSS 20B which is much quicker.`
      );
    }
    // TypeError: failed to fetch (network down / CORS / DNS)
    const msg = err instanceof Error ? err.message : String(err);
    throw new GroqError(
      'network',
      `Couldn’t reach Groq (${msg}). Check your internet connection and any VPN/ad-blocker, then try again.`
    );
  } finally {
    window.clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function askAboutDocument(
  apiKey: string | null,
  documentText: string,
  question: string,
  history: ChatTurn[],
  opts: GroqCallOptions
): Promise<GroqCallResult> {
  const system = [
    'You are DocLense, a friendly, precise document-analysis assistant embedded in a chat UI.',
    'Answer questions about the DOCUMENT below only. If the answer is not in the document, say so plainly, then offer your best general guidance.',
    'Ground every claim in the text, quote short snippets when helpful, and keep answers under ~150 words unless asked for depth.',
    'Use light Markdown (bold, bullets) — no tables, no code fences unless essential.',
    '',
    '=== DOCUMENT START ===',
    documentText.slice(0, 14_000),
    '=== DOCUMENT END ===',
  ].join('\n');

  const prior = history
    .filter((t) => !t.isError)
    .slice(-6)
    .map((t) => ({ role: t.role, content: t.content }));

  return groqChat(
    apiKey,
    [
      { role: 'system', content: system },
      ...prior,
      { role: 'user', content: question },
    ],
    opts
  );
}

export function formatChatError(err: unknown): string {
  if (err instanceof GroqError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something unexpected went wrong. Please try again.';
}
