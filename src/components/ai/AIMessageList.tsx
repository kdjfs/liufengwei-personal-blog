import { useEffect, useRef, useState } from 'react';
import { AIMarkdown } from './AIMarkdown';
import type { QuickAction } from './quick-actions';
import type { DisplayMessage } from './use-ai-assistant';

interface Props {
  messages: DisplayMessage[];
  quickActions: QuickAction[];
  isStreaming: boolean;
  onQuickAction: (prompt: string) => void;
  onRetry: () => void;
}

function Welcome({
  actions,
  onAction,
}: {
  actions: QuickAction[];
  onAction: (prompt: string) => void;
}) {
  return (
    <section className="ai-welcome" aria-labelledby="ai-welcome-title">
      <p className="ai-kicker">AI NATIVE DIGITAL GARDEN</p>
      <h2 id="ai-welcome-title">你好，我是 LFW AI 👋</h2>
      <p>可以基于博客内容陪你学习、解释代码和准备面试。</p>
      <fieldset className="ai-quick-actions">
        <legend className="sr-only">快捷提问</legend>
        {actions.map((action) => (
          <button key={action.label} type="button" onClick={() => onAction(action.prompt)}>
            <span>{action.label}</span>
            <i aria-hidden="true">↗</i>
          </button>
        ))}
      </fieldset>
    </section>
  );
}

export function AIMessageList({
  messages,
  quickActions,
  isStreaming,
  onQuickAction,
  onRetry,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const scrollVersion = messages
    .map((message) => `${message.id}:${message.status}:${message.content.length}`)
    .join('|');

  const goToLatest = () => {
    const container = scrollRef.current;
    if (!container) return;
    followRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    setShowLatest(false);
  };

  useEffect(() => {
    if (!scrollVersion && !isStreaming) return;
    const container = scrollRef.current;
    if (!container || !followRef.current) return;
    container.scrollTop = container.scrollHeight;
    setShowLatest(false);
  }, [scrollVersion, isStreaming]);

  return (
    <div
      ref={scrollRef}
      className="ai-messages"
      role="log"
      aria-label="AI 对话记录"
      onScroll={(event) => {
        const container = event.currentTarget;
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
        followRef.current = atBottom;
        setShowLatest(!atBottom);
      }}
    >
      {messages.length === 0 ? (
        <Welcome actions={quickActions} onAction={onQuickAction} />
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            className={`ai-message ai-message--${message.role} ${
              message.status === 'error' ? 'is-error' : ''
            }`}
          >
            <header>
              {message.role === 'assistant' && (
                <img src="/mascot/ali.webp" alt="" width="24" height="24" />
              )}
              <strong>{message.role === 'assistant' ? 'LFW AI' : '你'}</strong>
            </header>
            <div className="ai-message-content">
              {message.role === 'assistant' ? (
                message.status === 'error' ? (
                  <p>这次没问成功。</p>
                ) : message.content ? (
                  <AIMarkdown>{message.content}</AIMarkdown>
                ) : (
                  <span className="ai-thinking-pulse" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )
              ) : (
                <p>{message.content}</p>
              )}
              {message.status === 'streaming' && message.content && (
                <span className="ai-stream-cursor" aria-hidden="true" />
              )}
            </div>
            {message.status === 'error' && (
              <footer className="ai-error-actions">
                <button type="button" onClick={onRetry}>
                  重新发送
                </button>
                <details>
                  <summary>详情</summary>
                  <pre>{message.content}</pre>
                </details>
              </footer>
            )}
            {message.role === 'assistant' &&
            message.status === 'done' &&
            message.sources?.length ? (
              <footer className="ai-sources">
                <details>
                  <summary>参考 {message.sources.length} 篇博客内容</summary>
                  <div>
                    {message.sources.map((source) => (
                      <a key={source.id} href={source.url}>
                        <span>{source.title}</span>
                        <i aria-hidden="true">↗</i>
                      </a>
                    ))}
                  </div>
                </details>
              </footer>
            ) : null}
          </article>
        ))
      )}
      <p className="sr-only" role="status">
        {isStreaming ? 'LFW AI 正在生成回答' : '回答已完成'}
      </p>
      {showLatest && (
        <button
          type="button"
          className="ai-return-latest"
          onClick={goToLatest}
          aria-label="回到最新回答"
        >
          ↓ 回到最新
        </button>
      )}
    </div>
  );
}
