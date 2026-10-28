import { DocError, type DocStats, type FileMeta } from './types';

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const MIN_TEXT_CHARS = 40;
const MAX_PAGES = 80;
const MAX_EXTRACTED_CHARS = 60_000;

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.text', '.log', '.rst'];
const PDF_EXTENSIONS = ['.pdf'];
const ACCEPTED = [...TEXT_EXTENSIONS, ...PDF_EXTENSIONS];
export const ACCEPT_ATTR = '.pdf,.txt,.md,.markdown,.csv,.text,application/pdf,text/plain';

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    value /= 1024;
    unit = u;
    if (value < 1024) break;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

export interface ExtractionOutput {
  text: string;
  meta: FileMeta;
}

export async function extractTextFromFile(file: File): Promise<ExtractionOutput> {
  // ---- validation ladder ----------------------------------------------
  if (!file || file.size === 0) {
    throw new DocError(
      'empty-file',
      `“${file?.name ?? 'That file'}” is empty (0 bytes). Please choose a file that actually contains text.`
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DocError(
      'too-large',
      `“${file.name}” is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)}. Try compressing or splitting the document first.`
    );
  }
  const ext = extensionOf(file.name);
  const isPdfMime = file.type === 'application/pdf';
  const isTextMime =
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    file.type === 'application/octet-stream';

  const looksPdf = PDF_EXTENSIONS.includes(ext) || isPdfMime;
  const looksText = TEXT_EXTENSIONS.includes(ext) || (!!file.type && isTextMime && !isPdfMime);

  if (!looksPdf && !looksText) {
    throw new DocError(
      'invalid-type',
      `“${file.name}” doesn't look supported. DocLense reads PDF, TXT, Markdown and CSV files — please upload one of those.`
    );
  }
  if (!ACCEPTED.includes(ext) && ext !== '' && !isPdfMime && !isTextMime) {
    throw new DocError(
      'invalid-type',
      `“${file.name}” has an unsupported extension “${ext || '(none)'}”. Use PDF, TXT, MD or CSV.`
    );
  }

  // ---- extraction ------------------------------------------------------
  if (looksPdf) {
    const buffer = await file.arrayBuffer().catch(() => {
      throw new DocError('unreadable', `Couldn't read “${file.name}”. The file may be corrupted or locked by another app.`);
    });
    let pdfjs: typeof import('pdfjs-dist');
    try {
      pdfjs = await import('pdfjs-dist');
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      throw new DocError('unreadable', 'The PDF engine failed to load. Refresh the page and try again.');
    }
    try {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      const totalPages = doc.numPages;
      let text = '';
      const pageLimit = Math.min(totalPages, MAX_PAGES);
      for (let p = 1; p <= pageLimit; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        text += pageText.trim() + '\n\n';
        if (text.length > MAX_EXTRACTED_CHARS) break;
      }
      text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length < MIN_TEXT_CHARS) {
        throw new DocError(
          'no-text',
          `We couldn't pull any readable text out of “${file.name}”. It's probably a scanned/image PDF — try a text-based PDF, or export it to TXT or Markdown first.`
        );
      }
      return {
        text,
        meta: { name: file.name, sizeBytes: file.size, kind: 'pdf', pages: totalPages },
      };
    } catch (err) {
      if (err instanceof DocError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/password|encrypt/i.test(msg)) {
        throw new DocError('unreadable', `“${file.name}” is password-protected. Please remove the password and re-upload.`);
      }
      throw new DocError('unreadable', `This PDF couldn't be decoded (${msg.slice(0, 120)}). It may be corrupted — try re-exporting it.`);
    }
  }

  // plain text path
  const text = await file.text().catch(() => {
    throw new DocError('unreadable', `Couldn't read “${file.name}”. The file may be corrupted.`);
  });
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
  if (cleaned.length < MIN_TEXT_CHARS) {
    throw new DocError(
      'no-text',
      `“${file.name}” barely contains any text (${cleaned.length} characters). There needs to be at least a short paragraph to analyze.`
    );
  }
  return {
    text: cleaned,
    meta: { name: file.name, sizeBytes: file.size, kind: 'text' },
  };
}

// ---------------------------------------------------------------------------
// Document statistics
// ---------------------------------------------------------------------------

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let s = (w.match(/[aeiouy]{1,2}/g) || []).length;
  if (w.endsWith('e') && !w.endsWith('le') && !w.endsWith('ee')) s -= 1;
  return Math.max(1, s);
}

export function computeStats(text: string): DocStats {
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const wordCount = words.length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const sentenceMatches = text.match(/[.!?…]+(?=\s|$)/g);
  const sentences = Math.max(1, sentenceMatches ? sentenceMatches.length : 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || 1;
  const readingTimeSec = Math.max(1, Math.round((wordCount / 238) * 60));
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean)).size;

  // Flesch–Kincaid grade level (approx.)
  let readingGrade: number | null = null;
  if (wordCount >= 30 && sentences >= 1) {
    const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const grade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
    readingGrade = Math.max(1, Math.min(20, Math.round(grade)));
  }

  return {
    words: wordCount,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingTimeSec,
    uniqueWords,
    readingGrade,
  };
}

export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${minutes} min` : `${minutes} min ${rem}s`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
