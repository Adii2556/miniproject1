# Docent · Document Analysis Studio

> Fast, chat-style document intelligence powered by Groq LPUs. Drop in any PDF or text file and get instant summaries, key takeaways, topical keywords, sentiment analysis, document statistics, a self-scoring comprehension quiz, and grounded Q&A.

---

## ✨ Features

- **Client-Side Document Parsing**: Decode PDFs directly in your browser using `pdfjs-dist` Web Workers, alongside support for `.txt`, `.md`, and `.text` files up to 15 MB.
- **Customizable Generation**: Select exactly what to generate before running analysis:
  - **Summary**: Choose between *Concise*, *Executive*, or *Detailed* briefs.
  - **Key Points**: 5 to 7 crisp takeaways and central arguments.
  - **Keywords**: 8 to 12 topical tags for rapid scanning with in-reader highlighting.
  - **Sentiment Analysis**: Polarity gauge ($-100$ to $+100$), confidence score, and tone tags.
  - **Comprehension Quiz**: Self-scoring 10-question multiple-choice test with instant scoring and explanations.
- **Document Statistics & Readability**: In-depth statistics including word count, character count, sentence count, paragraph count, estimated reading time at 225 wpm, and lexicon diversity.
- **Verifiable Citations**: Every substantive summary, key point, and chat answer links to an exact page or paragraph excerpt. Citation chips open the reader at highlighted evidence.
- **Bounded Long-Document Analysis**: Deterministic map/reduce sampling analyzes at most six representative chunks plus one synthesis request and shows exact coverage.
- **Grounded Q&A Chat**: Follow-up questions use local relevance ranking, bounded source context, and page/paragraph citations.
- **Validated Model Output**: Zod schemas validate JSON and evidence, with one temperature-zero corrective retry before unsupported claims are omitted.
- **Export**: One-click `.txt` reports include numbered source footnotes with labels and exact excerpts.
- **Modern UI & Themes**: Tactile aesthetic with paper grain textures, dark/light theme switching, and custom typography (Bricolage Grotesque + Fraunces + Inter + JetBrains Mono).

---

## 🛠️ Tech Stack

- **Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite 7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **PDF Engine**: `pdfjs-dist`
- **Animations & Icons**: Framer Motion, `lucide-react`
- **AI Inference**: Groq Cloud REST API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Adii2556/miniproject1.git
cd miniproject1
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add a Groq API key
Open the Studio and paste your key into the sidebar. The key stays in tab memory only and is cleared when the tab closes or reloads. Never place a secret in a `VITE_*` environment variable because Vite embeds those values in browser bundles.

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## Security and privacy

- PDFs and text files are parsed locally in the browser. Document text is sent to Groq only when you request analysis or ask a question.
- API keys and document history are held in memory for the current tab; they are not persisted in browser storage.
- PDF processing is bounded by file size, page count, extracted text, image size, and processing time.
- The production bundle contains no session recorder, cross-window editor, or product telemetry.
- Deploy with the security headers in `public/_headers` or the equivalent configuration for your hosting provider.

Run the release checks before deployment:

```bash
npm run check
```

Run the mocked Chromium suite across desktop and mobile viewports:

```bash
npx playwright install chromium
npm run test:e2e
```

Deployment headers and sensitive-path exposure can be checked against staging with:

```bash
DEPLOYMENT_URL=https://staging.example.com npm run test:headers -- --project=desktop
```

The live Groq smoke is intentionally opt-in through the manual GitHub Actions workflow; CI uses deterministic API mocks and never requires a production key.
