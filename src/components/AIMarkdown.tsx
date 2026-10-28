import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Lightweight Markdown renderer for chat + summary text (bold, lists, code, links). */
export default function AIMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-1.5 text-[13px] leading-relaxed text-ink first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-1.5 list-none space-y-1.5 pl-0.5 text-[13px] leading-relaxed text-ink">{children}</ul>,
        ol: ({ children }) => (
          <ol className="my-1.5 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink marker:font-mono marker:text-[11px] marker:text-ink-soft">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="relative pl-4 before:absolute before:left-0 before:top-[0.42em] before:h-1.5 before:w-1.5 before:rounded-[2px] before:bg-coral">
            {children}
          </li>
        ),
        code: ({ children }) => {
          const s = String(children ?? '');
          if (s.includes('\n')) {
            // fenced block — react-markdown wraps this in <pre>; style plainly, pre draws the chrome
            return <code className="block whitespace-pre font-mono text-[11px] leading-relaxed text-amber">{children}</code>;
          }
          return (
            <code className="rounded-md border border-ink/25 bg-cream px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-coral-deep">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg border-2 border-ink bg-ink p-3">{children}</pre>,
        a: ({ children, href }) => (
          <a className="font-semibold text-skyc underline decoration-skyc/40 underline-offset-2" href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
        h1: ({ children }) => <h4 className="mb-1 mt-2 font-display text-[16px] font-black text-ink first:mt-0">{children}</h4>,
        h2: ({ children }) => <h4 className="mb-1 mt-2 font-display text-[15px] font-black text-ink first:mt-0">{children}</h4>,
        h3: ({ children }) => <h4 className="mb-1 mt-2 text-[13px] font-bold text-ink first:mt-0">{children}</h4>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-[3px] border-amber bg-[#fff8e3] py-1 pl-3 pr-2 text-[12.5px] italic text-ink-soft">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-2.5 border-dashed border-ink/20" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
