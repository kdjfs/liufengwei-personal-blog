import { useRef, useState } from 'react';

interface Props {
  disabled: boolean;
  onSend: (message: string) => void;
}

export function AIComposer({ disabled, onSend }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const message = value.trim();
    if (!message || disabled) return;
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
          maxLength={2000}
          value={value}
          disabled={disabled}
          placeholder={disabled ? '正在生成回答…' : '问一篇文章、一个项目或技术问题…'}
          onChange={(event) => {
            setValue(event.target.value);
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
        <button type="submit" disabled={disabled || !value.trim()} aria-label="发送消息">
          <span aria-hidden="true">↑</span>
        </button>
      </div>
      <div className="ai-composer-meta" aria-hidden="true">
        <span>ENTER 发送 · SHIFT + ENTER 换行</span>
        <span>{value.length}/2000</span>
      </div>
    </form>
  );
}
