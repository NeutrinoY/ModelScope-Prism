'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Shared Markdown renderer for assistant output: GFM tables/lists plus
 * highlighted code blocks. Kept independent so the highlighter can be
 * swapped later (docs/rebuild/10).
 */
export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose dark:prose-invert max-w-none text-sm leading-relaxed break-words',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            return !inline && match ? (
              <div className="rounded-md overflow-hidden my-4 border border-border bg-surface-muted/50">
                <div className="px-4 py-1.5 bg-surface-muted text-xs font-mono text-text-muted border-b border-border flex items-center justify-between">
                  <span>{match[1]}</span>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className={cn(
                  'bg-surface-muted px-1.5 py-0.5 rounded-md font-mono text-xs',
                  codeClassName
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
