import { AIMarkdown } from './AIMarkdown';
import type { QuickAction } from './quick-actions';
import type { DisplayMessage } from './use-ai-assistant';

interface Props {
  messages: DisplayMessage[];
  quickActions: QuickAction[];
  isStreaming: boolean;
  onQuickAction: (prompt: string) => void;
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
      <span className="ai-welcome-mark" aria-hidden="true">
        ✦
      </span>
      <h2 id="ai-welcome-title">你好，我是 LFW AI。</h2>
      <p>
        我可以基于这个博客的文章、项目和公开资料，帮你理解技术内容，也可以回答前端与 AI 相关问题。
      </p>
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

export function AIMessageList({ messages, quickActions, isStreaming, onQuickAction }: Props) {
  if (messages.length === 0) {
    return (
      <div className="ai-messages">
        <Welcome actions={quickActions} onAction={onQuickAction} />
      </div>
    );
  }

  return (
    <div className="ai-messages" role="log" aria-label="AI 对话记录">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`ai-message ai-message--${message.role} ${
            message.status === 'error' ? 'is-error' : ''
          }`}
        >
          <header>
            <span aria-hidden="true">{message.role === 'assistant' ? '✦' : '↳'}</span>
            <strong>{message.role === 'assistant' ? 'LFW AI' : 'YOU'}</strong>
          </header>
          <div className="ai-message-content">
            {message.role === 'assistant' ? (
              message.content ? (
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
          {message.role === 'assistant' && message.status === 'done' && message.sources?.length ? (
            <footer className="ai-sources">
              <p>参考博客内容</p>
              <div>
                {message.sources.map((source) => (
                  <a key={source.id} href={source.url}>
                    <span>{source.title}</span>
                    <i aria-hidden="true">↗</i>
                  </a>
                ))}
              </div>
            </footer>
          ) : null}
        </article>
      ))}
      <p className="sr-only" role="status">
        {isStreaming ? 'LFW AI 正在生成回答' : '回答已完成'}
      </p>
      <div ref={(node) => node?.scrollIntoView({ block: 'end' })} />
    </div>
  );
}
