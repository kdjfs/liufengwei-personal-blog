import { type PropsWithChildren, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function safeUrlTransform(url: string): string {
  const value = url.trim();
  if (value.startsWith('/') || value.startsWith('#')) return value;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function CodeBlock({ children }: PropsWithChildren) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.innerText ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="ai-code-block">
      <div className="ai-code-toolbar">
        <span>CODE</span>
        <button type="button" onClick={copy} aria-label="复制代码">
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

export function AIMarkdown({ children }: { children: string }) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        urlTransform={safeUrlTransform}
        components={{
          pre: CodeBlock,
          a({ href, children: linkChildren }) {
            const external = Boolean(href?.startsWith('http'));
            return (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
