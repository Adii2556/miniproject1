export interface DocStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTimeSec: number;
  uniqueWords: number;
  readingGrade: number | null;
}

export interface FileMeta {
  name: string;
  sizeBytes: number;
  kind: 'pdf' | 'text';
  pages?: number;
}

export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative' | 'Mixed';

export interface Sentiment {
  label: SentimentLabel;
  score: number; // -1 .. +1
  confidence: number; // 0 .. 1
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AnalysisOptions {
  summary: boolean;
  keyPoints: boolean;
  keywords: boolean;
  sentiment: boolean;
  quiz: boolean;
}

export interface AnalysisResult {
  title: string;
  summary?: string;
  keyPoints?: string[];
  keywords?: string[];
  sentiment?: Sentiment;
  quiz?: QuizQuestion[];
}

export interface UsageInfo {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
}

export type SummaryStyle = 'concise' | 'detailed' | 'executive';

export interface Settings {
  model: string;
  temperature: number;
  maxTokens: number;
  summaryStyle: SummaryStyle;
  quizCount: number;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

export class DocError extends Error {
  readonly code:
    | 'invalid-type'
    | 'too-large'
    | 'empty-file'
    | 'no-text'
    | 'unreadable';
  constructor(code: DocError['code'], message: string) {
    super(message);
    this.name = 'DocError';
    this.code = code;
  }
}

export class GroqError extends Error {
  readonly code:
    | 'missing-key'
    | 'auth'
    | 'rate-limit'
    | 'server'
    | 'network'
    | 'parse'
    | 'bad-request'
    | 'unknown';
  readonly status?: number;
  constructor(code: GroqError['code'], message: string, status?: number) {
    super(message);
    this.name = 'GroqError';
    this.code = code;
    this.status = status;
  }
}
