# Docent · Complete Project Documentation & Technical Architecture

---

## 1. Executive Summary & Purpose

**Docent** is a client-side, chat-styled **Document Analysis Studio** designed to turn arbitrary written documents—such as multi-page PDFs, technical whitepapers, financial market briefs, incident retrospectives, Markdown articles, or CSV spreadsheets—into interactive, structured intelligence in seconds.

Traditional document analyzers either:
1. Require uploading sensitive files to opaque third-party servers, or
2. Suffer from high latency when processing large contexts.

Docent solves both problems:
- **Local-First & Zero-Server Extraction**: All file ingestion, format decoding, and readability statistics calculation occur **100% inside the client browser** using browser APIs and Web Worker threads.
- **Ultra-Fast LPU Inference**: AI reasoning is powered directly by **Groq Cloud** using Language Processing Units (LPUs), delivering sub-second to low-second completions for structured JSON extraction and conversational Q&A.
- **Granular Generation Controls**: Users configure precisely which sections to generate (*Summary*, *Key Points*, *Keywords*, *Sentiment Analysis*, *Comprehension Quiz*) prior to triggering API consumption.
- **Neo-Editorial Design System**: A tactile, retro-modern interface combining hard drop shadows (`box-shadow: 3px 3px 0 0 #1d1e28`), warm paper tones (`#f6f4ec`), film grain textures, and editorial typography (Fraunces serif + Inter sans-serif + JetBrains Mono).

---

## 2. System Architecture & End-to-End Data Pipeline

```mermaid
flowchart TD
    subgraph Client Browser [Client Browser (d:\\Docent)]
        A[User File Drop / Sample Select] --> B[File Ingestion & Validation]
        B -->|PDF| C[pdfjs-dist Web Worker]
        B -->|Plain Text / MD / CSV| D[FileReader API]
        C --> E[Plain Text Content]
        D --> E
        
        E --> F[Statistical Engine: computeStats]
        F -->|Word count, Syllables, Readability Grade| G[DocStats State]
        
        E --> H{Configuration Phase: ConfigOptionsCard}
        H -->|User selects: Summary, Points, Keywords, Sentiment, Quiz| I[Analysis Pipeline: analyzeDocument]
    end

    subgraph Groq LPU Cloud
        I -->|Pass 1: Schema-Constrained Prompt| J[Groq Chat Completions API]
        J -->|JSON Object| K[Pass 1 Normalizer & Tolerant Parser]
        
        I -->|Pass 2 (If Quiz Selected)| L[Groq Quiz Generator API]
        L -->|JSON Array of MCQs| M[Pass 2 Quiz Normalizer]
    end

    subgraph User Experience Layer
        K --> N[Analysis Dashboard Cards]
        M --> O[Interactive Self-Scoring QuizCard]
        G --> P[Document Stats Metric Grid]
        N & O & P --> Q[ChatFeed Workspace]
        Q -->|Follow-up Question| R[askAboutDocument]
        R -->|Document Grounded Context| J
    end
```

---

## 3. Technology Stack & Dependencies

Each technology was deliberately chosen for performance, type safety, bundle footprint, and visual quality.

| Technology / Library | Version | Category | Purpose in Project |
| :--- | :--- | :--- | :--- |
| **React** | `^19.2.0` | UI Library | Core component-based reactive user interface. Utilizes React 19's updated rendering engine and hook ecosystem (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`). |
| **ReactDOM** | `^19.2.0` | DOM Renderer | Mounts React components to the browser DOM (`#root`) in [`main.tsx`](file:///d:/Docent/src/main.tsx). |
| **TypeScript** | `~5.9.3` | Language | Provides strict static type safety across data schemas, API response contracts, event handlers, and component props. |
| **Vite** | `^7.3.1` | Build Tool & Dev Server | Next-generation frontend tooling providing near-instant Hot Module Replacement (HMR) and optimized Rollup asset bundling. |
| **Tailwind CSS v4** | `^4.2.1` | Styling Engine | Modern CSS-first utility styling using `@import "tailwindcss"` and `@theme` directives without requiring legacy PostCSS config files. |
| **@tailwindcss/vite** | `^4.2.1` | Vite Plugin | Native Vite integration plugin for Tailwind CSS v4 for zero-configuration, lightning-fast compilation. |
| **pdfjs-dist** | `^4.10.38` | PDF Parser | Mozilla's industry-standard PDF rendering and text extraction library. Offloads PDF decompression and font parsing to an isolated Web Worker (`pdf.worker.min.mjs`). |
| **lucide-react** | `^0.577.0` | Iconography | High-performance, clean vector SVG icon components tailored for clean visual hierarchy. |
| **react-markdown** | `^10.1.0` | Content Parser | Safely parses Markdown syntax emitted by LLMs into styled React component trees. |
| **remark-gfm** | `^4.0.1` | Markdown Plugin | Extends Markdown parsing with GitHub Flavored Markdown features: tables, strikethrough, autolinks, and tasklists. |
| **framer-motion** | `^12.35.0` | Animation Library | Handles spring-based layout animations and state-driven interface transitions. |
| **Groq Cloud API** | OpenAI-Compatible | AI Inference | Ultra-high throughput inference engine powered by LPUs (Language Processing Units). |

---

## 4. Comprehensive Glossary of Technical Terms

1. **LPU (Language Processing Unit)**: An application-specific integrated circuit (ASIC) engineered by Groq specifically for sequential inference. Unlike GPUs that excel at matrix parallelization for training, LPUs minimize memory bandwidth bottlenecks, providing token generation speeds of 300–1000+ tokens per second.
2. **Tokens & Tokenization**: The foundational units of text processed by language models. Roughly 1 token $\approx$ 0.75 English words. In Docent, session token usage is actively monitored and summed across prompts and completions.
3. **Context Window**: The maximum token length a model can accept in a single request (e.g., 131,072 tokens for Llama 3.3 and GPT-OSS on Groq). Docent enforces safety limits (`MAX_ANALYSIS_CHARS = 14,000`, `MAX_QUIZ_CHARS = 10,000`) to guarantee fast response times and avoid rate limiting.
4. **Flesch-Kincaid Grade Level**: A readability metric calculated from average sentence length ($L = \text{words} / \text{sentences}$) and average syllables per word ($S = \text{syllables} / \text{words}$):
   $$\text{Grade} = 0.39 \times \left(\frac{\text{total words}}{\text{total sentences}}\right) + 11.8 \times \left(\frac{\text{total syllables}}{\text{total words}}\right) - 15.59$$
   A score of 8 represents 8th-grade reading level; 12 represents high school senior; 14+ represents university level.
5. **Reading Speed Baseline**: Docent calculates estimated reading time using the standard adult cognitive reading rate of **238 words per minute (WPM)**.
6. **Structured Output (JSON Mode)**: Forcing an LLM to respond exclusively with a valid JSON payload matching a declared schema, configured via `response_format: { type: "json_object" }`.
7. **Tolerant JSON Parsing**: A custom parsing utility ([`tolerantParse`](file:///d:/Docent/src/lib/analysis.ts#L46)) that cleans markdown code fences (````json ... ````) and locates matching outermost brackets (`{ ... }` or `[ ... ]`), preventing application crashes from unexpected preamble or truncated tokens.
8. **Web Worker**: A background browser thread running in parallel with the main UI thread. `pdfjs-dist` executes in a Web Worker to ensure UI rendering remains buttery smooth (60 FPS) while decompressing dense PDF pages.
9. **Neo-Editorial / Brutalist UI**: A visual design paradigm featuring bold outlines (`border-2 border-ink`), hard drop shadows without blur (`box-shadow: 3px 3px 0 0 #1d1e28`), tactile press animations (`transform: translate(2px, 2px)`), warm cream/paper palettes, and high-contrast typography.
10. **Sentiment Polarity vs. Confidence**: Polarity represents the emotional direction of the text from $-1.0$ (very negative) through $0.0$ (neutral) to $+1.0$ (very positive). Confidence represents the model's certainty ($0.0 \dots 1.0$) based on explicit tonal indicators in the text.
11. **Hot Module Replacement (HMR)**: Vite's dev server mechanism that exchanges, adds, or removes modules in a running application without triggering a full page reload, preserving state in the browser.

---

## 5. Repository Directory Structure

```
d:\Docent\
├── .git/                     # Git source control repository
├── .gitignore                # Files excluded from version control (node_modules, logs, dist)
├── .vite-source-tags.js      # Custom Vite AST compiler plugin for visual DOM inspection
├── eslint.config.js          # ESLint 9 configuration with typescript-eslint & react-hooks
├── index.html                # Entry HTML template with Google Fonts, analytics, and root container
├── package-lock.json         # Exact dependency lockfile
├── package.json              # Project manifest, npm scripts, and dependencies
├── README.md                 # Public repository documentation
├── PROJECT_DOCUMENTATION.md  # Exhaustive project & architecture reference
├── tsconfig.app.json         # TypeScript configuration for application source code
├── tsconfig.json             # Root TypeScript project references configuration
├── tsconfig.node.json        # TypeScript configuration for Vite and Node build scripts
├── vite.config.ts            # Vite 7 build configuration and plugin declarations
├── public/                   # Static public assets served directly at root URL
│   ├── favicon.svg           # Brand SVG document icon with accent markers
│   ├── vite.svg              # Default Vite logo asset
│   └── images/
│       └── empty-state.png   # Illustrative graphic for zero-state views
└── src/                      # Application source code
    ├── App.css               # Component-level styling overrides (empty in favor of index.css)
    ├── App.tsx               # Root application component & global state orchestrator
    ├── index.css             # Tailwind v4 theme, fonts, hard-shadow utilities & CSS animations
    ├── main.tsx              # Application entry point: ReactDOM root creation
    ├── assets/
    │   └── react.svg         # React vector logo
    ├── components/           # React UI components
    │   ├── AIMarkdown.tsx    # Styled markdown renderer for assistant bubbles and summaries
    │   ├── ChatFeed.tsx      # Main message stream, intelligent auto-scroll & composer
    │   ├── MessageBlocks.tsx # Visual cards (Title, Summary, Points, Keywords, Sentiment, Stats)
    │   ├── messages.tsx      # Reusable bubble shells (AiBubble, UserBubble, ErrorBubble)
    │   ├── QuizCard.tsx      # Interactive self-scoring quiz with SVG completion ring
    │   ├── Sidebar.tsx       # Collapsible drawer for API key management, model picker & parameters
    │   ├── Toast.tsx         # Floating alert notification system
    │   ├── TopBar.tsx        # Application header with status badge, clear, and regenerate actions
    │   └── UploadZone.tsx    # Drag-and-drop file target and preloaded sample selector
    └── lib/                  # Core business logic, parsers, and utilities
        ├── analysis.ts       # Two-pass Groq prompt construction, schema validation & export
        ├── extract.ts        # Client-side PDF & text extraction, syllable counting, readability
        ├── groq.ts           # Groq API client, model catalog, key resolution & error mapping
        ├── samples.ts        # 3 built-in sample documents (Market brief, Edge AI, Postmortem)
        └── types.ts          # Central TypeScript interfaces, types, and custom error classes
```

---

## 6. Detailed File-by-File Technical Breakdown

### Root Configuration Files

#### [`package.json`](file:///d:/Docent/package.json)
The project descriptor. Contains project metadata, dependency declarations, and standard scripts:
- `"dev": "vite"`: Launches the local development server with HMR.
- `"build": "tsc -b && vite build"`: Runs type checking across project references followed by production Rollup optimization into the `/dist` directory.
- `"lint": "eslint ."`: Runs ESLint static analysis.
- `"preview": "vite preview"`: Spawns a local HTTP server to preview production builds.

#### [`vite.config.ts`](file:///d:/Docent/vite.config.ts)
The build configuration file. Key elements:
- Plugins: Imports `@vitejs/plugin-react` for JSX transformation and `@tailwindcss/vite` for Tailwind CSS v4.
- Source Tags: Loads `.vite-source-tags.js` to inject source line indicators into DOM nodes during development.
- Environment Prefixes: Declares `['VITE_', 'NEXT_PUBLIC_']` to safely expose API keys defined in `.env.local` to the client runtime.

#### [`.vite-source-tags.js`](file:///d:/Docent/.vite-source-tags.js)
A custom compiler plugin using `@babel/parser`, `@babel/traverse`, and `@babel/generator`. It traverses the JSX Abstract Syntax Tree (AST) at compile time and attaches `data-source-loc="file:line:col"` attributes to elements, enabling visual debugging tools to map rendered elements back to their exact source lines.

#### [`tsconfig.json`](file:///d:/Docent/tsconfig.json), [`tsconfig.app.json`](file:///d:/Docent/tsconfig.app.json), [`tsconfig.node.json`](file:///d:/Docent/tsconfig.node.json)
TypeScript configuration divided according to project references:
- `tsconfig.app.json`: Targets browser environment (`ES2020`, `DOM`, `DOM.Iterable`), enforces strict mode, forbids unused locals/parameters, and sets JSX mode to `react-jsx`.
- `tsconfig.node.json`: Targets Node runtime environments for Vite configuration and build scripts.
- `tsconfig.json`: Root aggregator referencing both configurations.

#### [`eslint.config.js`](file:///d:/Docent/eslint.config.js)
Flat ESLint configuration adopting standard `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh` rules.

#### [`index.html`](file:///d:/Docent/index.html)
The single-page HTML container:
- Loads Google Fonts: **Fraunces** (display serif), **Inter** (body sans), and **JetBrains Mono** (monospace data).
- Mounts `#root` where React takes control.
- Sets application theme color (`#f6f4ec`) to prevent flickering during loading.

---

### Core Business Logic (`src/lib/`)

#### [`src/lib/types.ts`](file:///d:/Docent/src/lib/types.ts)
The contract definition center:
- `DocStats`: Numerical metrics representing document volume, structure, reading time, and reading grade level.
- `FileMeta`: Ingested file descriptor (`name`, `sizeBytes`, `kind: 'pdf' | 'text'`, optional `pages`).
- `SentimentLabel` & `Sentiment`: Typed classification (`Positive`, `Neutral`, `Negative`, `Mixed`), polarity score ($-1 \dots +1$), confidence ($0 \dots 1$), and rationale.
- `QuizQuestion`: Question text, 4 options array, `correctIndex` ($0 \dots 3$), and explanatory string.
- `AnalysisOptions`: Checkbox flags for custom generation (`summary`, `keyPoints`, `keywords`, `sentiment`, `quiz`).
- `AnalysisResult`: Complete structured output payload.
- `Settings`: User-customizable parameters for model selection, temperature, token limits, summary style, and question counts.
- `DocError` & `GroqError`: Dedicated error classes with typed machine codes (`missing-key`, `auth`, `rate-limit`, `invalid-type`, `too-large`, `no-text`).

#### [`src/lib/extract.ts`](file:///d:/Docent/src/lib/extract.ts)
Client-side document reader and statistical analyzer:
- `extractTextFromFile(file)`: Validates file existence, MIME type, and size limits (capped at 15 MB).
  - For PDFs: Uses `pdfjs-dist` to parse pages sequentially (up to 80 pages or 60,000 characters). Extracts text tokens from `page.getTextContent().items`. Detects scanned/image-only PDFs and throws a descriptive `DocError('no-text')`.
  - For Text files: Reads UTF-8 text via `file.text()`.
- `computeStats(text)`:
  - Tokenizes text into word arrays.
  - Matches sentence endings using regular expressions (`/[.!?…]+(?=\s|$)/g`).
  - Matches paragraph boundaries (`/\n\s*\n/`).
  - Measures unique vocabulary using a normalized `Set`.
  - Employs `countSyllables` (matching vowel pairs and silent 'e' exceptions) to calculate the **Flesch-Kincaid Grade Level**.

#### [`src/lib/groq.ts`](file:///d:/Docent/src/lib/groq.ts)
The Groq Cloud API interface:
- Model Registry (`GROQ_MODELS`): Contains verified production models (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
- `resolveApiKey()`: Resolves API credentials across `import.meta.env`, `sessionStorage`, and `localStorage`.
- `saveApiKey()` & `clearApiKey()`: Persists or revokes keys according to user preference.
- `groqChat(apiKey, messages, opts)`: Core fetch wrapper executing HTTP POST requests against `https://api.groq.com/openai/v1/chat/completions`. Handles `AbortController` timeouts (60s), passes `response_format: { type: 'json_object' }` when JSON is requested, and translates HTTP status codes (400, 401, 404, 413, 429, 500) into friendly, actionable `GroqError` exceptions.
- `askAboutDocument(apiKey, documentText, question, history, opts)`: Grounded Q&A executor that slices up to 14,000 characters of the document and prepends conversation history to ensure accurate answers.

#### [`src/lib/analysis.ts`](file:///d:/Docent/src/lib/analysis.ts)
Two-pass AI orchestration engine:
- `buildAnalysisSchema(options)`: Dynamically generates the required JSON schema string depending on which checkboxes the user enabled.
- `analyzeDocument(apiKey, fullText, settings, options, onStage)`:
  - **Pass 1 (Insights)**: If any insights (*summary, key points, keywords, sentiment*) are checked, queries Groq with strict JSON output instructions. Automatically retries if JSON output is malformed.
  - **Pass 2 (Quiz)**: If the quiz is selected, executes a second request to generate multiple-choice questions with plausible distractors. If the quiz is unchecked, completely skips Pass 2 to save time and API quota.
  - Aggregates usage tokens and latencies across both passes into a unified `UsageInfo` summary.
- `generateQuiz(...)`: Dedicated function to regenerate a fresh set of questions from the same document without re-running the entire analysis.
- `buildSummaryText(result)`: Converts the structured analysis result into a clean, formatted `.txt` report for instant downloading.

#### [`src/lib/samples.ts`](file:///d:/Docent/src/lib/samples.ts)
Provides 3 curated, built-in documents so the application can be explored immediately without needing external files:
1. **Meridian Robotics Q3 Market Brief**: Positive business earnings report with revenue metrics, competitive analysis, and customer NPS figures.
2. **The Quiet Shift at the Edge of AI**: Neutral technical research overview on local inference, NPUs, quantization, and hybrid architectures.
3. **Project Aurora Postmortem**: Mixed incident retrospective detailing a database migration outage, connection pool saturation, and operational lessons.

---

### UI Components (`src/components/`)

#### [`src/App.tsx`](file:///d:/Docent/src/App.tsx)
The central nervous system of Docent:
- Orchestrates global application state:
  - `phase`: `'idle' | 'configuring' | 'analyzing' | 'done' | 'error'`
  - `doc`: Currently loaded document text, file metadata, and computed stats.
  - `analysis`: Generated analysis payload.
  - `analysisOptions`: Active checkbox selections (`summary`, `keyPoints`, `keywords`, `sentiment`, `quiz`), saved in `localStorage['docent.options']`.
  - `settings`: Active model, temperature, token limits, and summary style, saved in `localStorage['docent.settings']`.
  - `chatTurns`: Interactive conversational Q&A thread.
  - `quizAnswers` & `quizSubmitted`: User's quiz selections and scored state.
- Wires together `TopBar`, `Sidebar`, `ChatFeed`, and `ToastStack`.
- Implements `handleStartAnalysis`, `handleRegenerate`, and `handleAdjustOptions`.

#### [`src/components/ChatFeed.tsx`](file:///d:/Docent/src/components/ChatFeed.tsx)
The scrollable interaction canvas:
- Intelligent Scroll Positioning:
  - When `phase === 'done'`: Smoothly scrolls to the **top of the analysis card** (`#analysis-anchor` with `block: 'start'`), positioning the title and summary directly in view right beneath the uploaded document.
  - When `phase === 'configuring'`: Smoothly scrolls to the checkbox options card (`#config-anchor`).
  - When chatting: Smoothly scrolls to `bottomRef` to display incoming answers.
- Keyboard Shortcut: Pressing `/` outside input fields automatically focuses the chat composer.
- Quick Prompts: Renders instant starter questions (*"Explain it simpler"*, *"What's the main takeaway?"*, *"Why is the sentiment that way?"*, *"Top 3 keywords"*, *"What's missing here?"*).

#### [`src/components/MessageBlocks.tsx`](file:///d:/Docent/src/components/MessageBlocks.tsx)
The presentation building blocks:
- `FileMessage`: Displays the user's uploaded file as an interactive chat bubble with file size and page count badges.
- `ConfigOptionsCard`: Interactive checkbox selector allowing users to toggle sections before analysis, pick summary styles (*Concise / Executive / Detailed*), and choose question counts (*3, 5, 7, 10*).
- `BusyMessage`: Animated live progress stepper indicating current pipeline stages (*Reading document*, *Mapping key ideas*, *Weighing sentiment*, *Cooking quiz*, *Polishing card*).
- `ErrorMessage`: Context-aware error alerts displaying custom troubleshooting buttons (*Open key field*, *Retry*, *Groq console link*).
- `AnalysisMessage`: The primary analysis output containing:
  - Top action bar with `[↻ Regenerate]`, `[⚙ Options]`, and `[⬇ .txt]`.
  - Suggested Title with one-click clipboard copy.
  - Summary with style badge and formatted Markdown.
  - Key Points with numbered indicator badges.
  - Keyword tag pills.
  - Sentiment Card with polarity meter gauge and confidence meter.
  - Document Stats Grid (Words, Characters, Reading Time, Sentences, Paragraphs, Unique Words, Grade Level, Latency, Tokens).
  - Embedded `QuizCard`.
  - Bottom action bar for regeneration and export.

#### [`src/components/QuizCard.tsx`](file:///d:/Docent/src/components/QuizCard.tsx)
Comprehension testing widget:
- Pre-submission state: Renders questions with A/B/C/D option pills and dynamic progress indication (*"N of M answered"*).
- Post-submission state: Displays a dynamic SVG score ring (green for 100%, amber for 60%+, coral for <60%), an encouraging evaluation verdict, and an itemized answer review highlighting correct/incorrect choices alongside explanations.
- One-click `[Generate quiz again]` button that calls `generateQuiz` without re-running the rest of the document analysis.

#### [`src/components/Sidebar.tsx`](file:///d:/Docent/src/components/Sidebar.tsx)
Desktop rail & mobile drawer for technical configuration:
- API Key Input: Obfuscated key input with remember-me checkbox and status chips (*Environment Locked*, *Stored on Device*, *Session Only*).
- Connectivity Probe: `[Test Connection]` button executing a live ping to verify API credentials and report round-trip network latency in milliseconds.
- Model Selector: Radio cards displaying model names, inference speeds (tokens/sec), pricing per million tokens, and recommended use cases.
- Sliders: Custom styled sliders for Temperature ($0.0 \dots 1.5$) and Max Tokens ($256 \dots 4096$).
- Token Usage Counter: Live tracker displaying total prompt and completion tokens consumed during the current browsing session.

#### [`src/components/TopBar.tsx`](file:///d:/Docent/src/components/TopBar.tsx)
Application header providing:
- Docent logo and studio subtitle.
- Live Groq connection badge (*"Groq · Online"* with pulsing indicator).
- `[↻ Regenerate]` shortcut button visible whenever an active document is loaded.
- `[Clear]` workspace button.
- Responsive toggle button for the Settings drawer.

#### [`src/components/UploadZone.tsx`](file:///d:/Docent/src/components/UploadZone.tsx)
Interactive dropzone component supporting both hero (empty state) and compact (footer) variants:
- Visual drag feedback: Dashed border changes to coral with subtle scaling when dragging files over the window.
- Hidden file input mapped to keyboard triggers (Enter / Space).
- Sample selector chips allowing instant loading of Meridian Robotics, Edge AI, or Project Aurora.

#### [`src/components/AIMarkdown.tsx`](file:///d:/Docent/src/components/AIMarkdown.tsx)
Safe Markdown renderer:
- Uses `react-markdown` and `remark-gfm`.
- Renders bullet lists with coral square indicators (`before:rounded-[2px] before:bg-coral`).
- Custom styles for inline code badges, preformatted code blocks, blockquotes, and hyperlinks that open securely in new tabs.

#### [`src/components/messages.tsx`](file:///d:/Docent/src/components/messages.tsx)
Standardized visual layout wrappers:
- `AiBubble`: Off-white card aligned to the left with custom Docent robot avatar.
- `UserBubble`: Dark ink card aligned to the right with user avatar.
- `ErrorBubble`: Coral card with alert icon.
- `AnalysisCard`: Standard container with colored header strip and action slot.

#### [`src/components/Toast.tsx`](file:///d:/Docent/src/components/Toast.tsx)
Non-blocking notification system:
- `useToasts()` hook providing `push(kind, title, message)` and automatic 6.5-second dismissal timers.
- `ToastStack`: Fixed position bottom-right container rendering slide-in notifications for success, info, and error alerts.

---

### Styling & Design System (`src/index.css`)

[`src/index.css`](file:///d:/Docent/src/index.css) implements the Neo-Editorial design language:

```css
@theme {
  --color-paper: #f6f4ec;       /* Warm background canvas */
  --color-cream: #eceadd;       /* Rail & sidebar background */
  --color-card: #fffdf6;        /* High-contrast content cards */
  --color-ink: #1d1e28;         /* Deep text and border color */
  --color-ink-soft: #55565f;    /* Secondary metadata text */
  --color-coral: #ff4b33;       /* Primary CTA & user accent */
  --color-amber: #ffb43a;       /* Highlight & progress accent */
  --color-leaf: #1f9d6b;        /* Success & positive tone accent */
  --color-skyc: #3d7bfd;        /* Neutral tone & link accent */
  --font-display: "Fraunces";   /* Editorial serif */
  --font-sans: "Inter";         /* Clean body sans */
  --font-mono: "JetBrains Mono";/* Technical code and numbers */
}
```

Key utility classes:
- `.hard`: Signature solid shadow (`box-shadow: 6px 6px 0 0 var(--color-ink)`).
- `.hard-sm` & `.hard-xs`: Scaled drop shadows (3px and 2px) for buttons and chips.
- `.press`: Interactive tactile click effect that translates elements 2px down and right on click while reducing the shadow offset.
- `.dotgrid`: Background pattern using radial gradient dots.
- `.grain-layer`: An SVG turbulence filter overlay creating subtle vintage print texture across the viewport.

---

## 7. Security, Privacy & Performance

1. **Client-Side Privacy**: Documents uploaded by users are never transmitted to any third-party intermediary or Docent server. Text extraction runs entirely in the user's browser memory.
2. **Encrypted Direct API Calls**: Requests are dispatched directly from the browser to Groq's official API (`https://api.groq.com/openai/v1/chat/completions`) over TLS 1.3 encryption.
3. **API Key Security**:
   - Environment keys (`VITE_GROQ_API_KEY`) can be locked at build/deployment time.
   - Keys entered in the UI are never transmitted anywhere except to Groq's authorization header (`Authorization: Bearer <key>`).
   - Users can choose between `localStorage` (persisted across sessions) or `sessionStorage` (cleared when closing the browser tab).
   - A single-click `[Forget Key]` button purges stored keys instantly.
4. **Resilience & Rate Limit Protection**:
   - Long documents are safely bounded to 14,000 characters for analysis and 10,000 characters for quizzes.
   - HTTP 429 rate limits are caught cleanly and surface an inline countdown retry button.
   - Quizzes fail gracefully without breaking the primary analysis card.
5. **Memory Management**: Object URLs created during PDF parsing and summary downloading (`URL.createObjectURL`) are systematically revoked (`URL.revokeObjectURL`) to prevent memory leaks.

---

## 8. Summary of Recent Improvements

1. **Intelligent Viewport Anchoring**:
   - Fixed an issue where the feed auto-scrolled to the bottom on analysis completion.
   - Replaced unconditional scroll triggers with target anchoring: upon generation, the viewport smoothly glides to the top of the analysis card (`#analysis-anchor`), presenting the title and summary immediately.
2. **Accessible Regeneration**:
   - Added `[↻ Regenerate]` buttons across the TopBar, the top of the analysis card, the bottom review bar, and the chat quick-prompt toolbar.
3. **Pre-Analysis Checkbox Selector**:
   - Added the `configuring` phase with `ConfigOptionsCard`, allowing users to select any combination of *Summary*, *Key Points*, *Keywords*, *Sentiment Analysis*, and *Comprehension Quiz*.
   - Unselected sections are completely excluded from API calls, significantly reducing latency and token costs.
4. **Enhanced Connectivity Probe**:
   - Increased connectivity probe token limits from 8 to 32 tokens, ensuring reasoning models have sufficient headroom to return confirmation tokens without false warnings.
5. **Version Control Integration**:
   - Initialized Git repository, cleanly resolved merge conflicts against the remote repository, and pushed all commits to `https://github.com/Adii2556/miniproject1.git`.
