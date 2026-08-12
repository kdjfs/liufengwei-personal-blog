import { useRef, useState } from 'react';
import { CHAT_LIMITS, truncateUnicode, unicodeLength } from '@/lib/ai/chat-contract';

interface Props {
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m4 10 12-6-3.6 12-2.3-4.1L4 10Z" />
      <path d="m10.1 11.9 2.8-2.8" />
    </svg>
  );
}

export function AIComposer({ isStreaming, onSend, onStop }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const message = value.trim();
    if (!message || isStreaming) return;
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(message);
  };

  return (
    <form
      className="ai-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor="lfw-ai-input" className="sr-only">
        向 LFW AI 提问
      </label>
      <div className="ai-input-shell">
        <textarea
          ref={textareaRef}
          id="lfw-ai-input"
          rows={1}
          value={value}
          disabled={isStreaming}
          placeholder={isStreaming ? '正在生成回答…' : '问文章、代码或学习问题…'}
          onChange={(event) => {
            setValue(truncateUnicode(event.target.value, CHAT_LIMITS.messageContent));
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type={isStreaming ? 'button' : 'submit'}
          className={isStreaming ? 'is-stop' : ''}
          disabled={!isStreaming && !value.trim()}
          aria-label={isStreaming ? '停止生成' : '发送消息'}
          onClick={isStreaming ? onStop : undefined}
        >
          {isStreaming ? <span className="ai-stop-icon" aria-hidden="true" /> : <SendIcon />}
        </button>
      </div>
      <div className="ai-composer-meta">
        <span>ENTER 发送 · SHIFT + ENTER 换行</span>
        {unicodeLength(value) >= CHAT_LIMITS.messageContent * 0.8 && (
          <span aria-live="polite">
            {unicodeLength(value)}/{CHAT_LIMITS.messageContent}
          </span>
        )}
      </div>
    </form>
  );
}
