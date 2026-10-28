# Docent · Document Analysis Studio

> Fast, chat-style document intelligence powered by Groq LPUs. Drop in any PDF or text file and get instant summaries, key takeaways, topical keywords, sentiment analysis, document statistics, a self-scoring comprehension quiz, and grounded Q&A.

---

## ✨ Features

- **Client-Side Document Parsing**: Decode PDFs directly in your browser using `pdfjs-dist` Web Workers, alongside support for `.txt`, `.md`, `.markdown`, and `.csv` files up to 15 MB.
- **Customizable Generation**: Select exactly what to generate before running analysis:
  - **Summary**: Choose between *Concise*, *Executive*, or *Detailed* briefs.
  - **Key Points**: 4 to 6 numbered takeaways and central arguments.
  - **Keywords**: 8 to 12 topical tags for rapid scanning.
  - **Sentiment Analysis**: Polarity gauge ($-1.0$ to $+1.0$), confidence score, and contextual explanation.
  - **Comprehension Quiz**: Self-scoring multiple-choice test (3, 5, 7, or 10 questions) with instant scoring and explanations.
- **Document Statistics & Readability**: In-depth statistics including word count, character count, sentence count, paragraph count, estimated reading time, and **Flesch-Kincaid Grade Level**.
- **Grounded Q&A Chat**: Ask follow-up questions about the document in an interactive chat feed with light Markdown formatting and quick-prompt suggestions.
- **Regenerate & Tweak**: One-click regeneration of responses and options customization.
- **Export**: One-click download of the complete analysis report as a `.txt` file.
- **Neo-Editorial UI**: Tactile aesthetic with hard drop shadows, paper/cream tones, and custom typography (Fraunces + Inter + JetBrains Mono).

---

## 🛠️ Tech Stack

- **Framework**: React 19, TypeScript
- **Bundler & Tooling**: Vite 7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **PDF Engine**: `pdfjs-dist` (v4.10)
- **Icons**: `lucide-react`
- **Markdown**: `react-markdown` & `remark-gfm`
- **AI Inference**: Groq Cloud REST API (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)

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

### 3. Set up Groq API Key
You can either:
- Enter your Groq API key (`gsk_...`) directly in the app's sidebar settings.
- Or create a `.env.local` file in the root directory:
```env
VITE_GROQ_API_KEY=gsk_your_api_key_here
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production
```bash
npm run build
```

---

## 📄 License
MIT
