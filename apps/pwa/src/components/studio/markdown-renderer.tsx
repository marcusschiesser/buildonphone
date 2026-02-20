import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function StudioMarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="max-w-full text-sm leading-relaxed break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold">{children}</h3>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline break-all"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg border border-zinc-700 bg-black/35 p-2 text-xs leading-relaxed text-zinc-100">
              {children}
            </pre>
          ),
          code: ({ children }) => <code className="rounded bg-black/35 px-1 py-0.5 text-[0.9em] text-zinc-100">{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-300">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-zinc-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
