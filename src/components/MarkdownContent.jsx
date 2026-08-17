import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isSafeHttpUrl } from '../utils/normalizeUrl.js';

// Explicit element styling: @tailwindcss/typography isn't a dependency, and
// pulling it in for one surface isn't worth the bundle.
//
// react-markdown does not render raw HTML unless rehype-raw is added, so
// markdown in notes cannot inject markup. Links are additionally filtered
// through isSafeHttpUrl to keep javascript:/data: URLs out of href.
const COMPONENTS = {
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-base font-semibold text-zinc-950 dark:text-white first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 mb-2 text-sm font-semibold text-zinc-950 dark:text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-medium text-zinc-950 dark:text-white first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-950 dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-zinc-300 dark:border-zinc-600 pl-3 text-zinc-600 dark:text-zinc-400 first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => (
    inline
      ? <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[0.85em] text-zinc-900 dark:text-zinc-100">{children}</code>
      : <code className="font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 first:mt-0 last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-zinc-950/10 dark:border-white/10" />,
  a: ({ href, children }) => (
    isSafeHttpUrl(href)
      ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:text-violet-700 dark:hover:text-violet-300"
        >
          {children}
        </a>
      )
      : <span>{children}</span>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto first:mt-0 last:mb-0">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-zinc-950/10 dark:border-white/10 px-2 py-1 font-medium text-zinc-950 dark:text-white">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-950/5 dark:border-white/5 px-2 py-1 align-top">{children}</td>
  ),
  input: ({ checked, type }) => (
    // GFM task-list checkboxes — rendered read-only; editing happens in the
    // textarea, not the preview.
    type === 'checkbox'
      ? <input type="checkbox" checked={!!checked} readOnly className="mr-1.5 align-middle accent-violet-600" />
      : null
  ),
};

export default function MarkdownContent({ children, className = '' }) {
  return (
    <div className={`text-sm text-zinc-700 dark:text-zinc-300 break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
