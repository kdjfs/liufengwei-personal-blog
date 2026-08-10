import { forwardRef } from 'react';
import { truncateUnicode, unicodeLength } from '@/lib/ai/chat-contract';
import type { ChatMode, SelectionContext } from '@/lib/ai/types';
import { AIComposer } from './AIComposer';
import { AIMessageList } from './AIMessageList';
import type { QuickAction } from './quick-actions';
import type { DisplayMessage } from './use-ai-assistant';

interface Props {
  mode: ChatMode;
  messages: DisplayMessage[];
  quickActions: QuickAction[];
  isStreaming: boolean;
  knowledgeStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
  onModeChange: (mode: ChatMode) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  onClear: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  selection?: SelectionContext;
  onClearSelection: () => void;
  cloudAiState: 'disabled' | 'idle' | 'loading' | 'anonymous' | 'authenticated' | 'error';
  persistConversation: boolean;
  privateLearningContext: boolean;
  onPersistConversationChange: (value: boolean) => void;
  onPrivateLearningContextChange: (value: boolean) => void;
}

const statusLabels = {
  idle: 'STANDBY',
  loading: 'LOADING CONTEXT',
  ready: 'BLOG CONTEXT READY',
  unavailable: 'CONTEXT OFFLINE',
} as const;

export const AIChatPanel = forwardRef<HTMLElement, Props>(function AIChatPanel(
  {
    mode,
    messages,
    quickActions,
    isStreaming,
    knowledgeStatus,
    onModeChange,
    onSend,
    onStop,
    onClear,
    onMinimize,
    onClose,
    onKeyDown,
    selection,
    onClearSelection,
    cloudAiState,
    persistConversation,
    privateLearningContext,
    onPersistConversationChange,
    onPrivateLearningContextChange,
  },
  ref,
) {
  return (
    <section
      ref={ref}
      id="lfw-ai-panel"
      className="ai-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lfw-ai-title"
      onKeyDown={onKeyDown}
    >
      <header className="ai-panel-header">
        <div className="ai-identity">
          <span className="ai-identity-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <h2 id="lfw-ai-title">LFW AI</h2>
            <p>DeepSeek V4 Pro · {mode === 'deep' ? '深度思考' : '快速'}</p>
          </div>
        </div>
        <div className="ai-panel-actions">
          {isStreaming && (
            <button type="button" onClick={onStop}>
              Stop
            </button>
          )}
          <button type="button" onClick={onClear} disabled={messages.length === 0}>
            Clear
          </button>
          <button type="button" onClick={onMinimize} aria-label="最小化 AI 助手">
            <span aria-hidden="true">−</span>
          </button>
          <button type="button" onClick={onClose} aria-label="关闭 AI 助手">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>

      <div className="ai-modebar">
        <fieldset className="ai-mode-switch">
          <legend className="sr-only">回答模式</legend>
          <button
            type="button"
            aria-pressed={mode === 'fast'}
            disabled={isStreaming}
            onClick={() => onModeChange('fast')}
          >
            <span>快速</span>
            <small>THINKING OFF</small>
          </button>
          <button
            type="button"
            aria-pressed={mode === 'deep'}
            disabled={isStreaming}
            onClick={() => onModeChange('deep')}
          >
            <span>深度思考</span>
            <small>PRO · MAX</small>
          </button>
        </fieldset>
        <p className={`ai-context-status is-${knowledgeStatus}`}>
          <i aria-hidden="true" />
          <span>{statusLabels[knowledgeStatus]}</span>
        </p>
      </div>

      {cloudAiState !== 'disabled' && (
        <aside className="ai-cloud-controls" aria-label="AI 云端隐私选项">
          {cloudAiState === 'authenticated' ? (
            <fieldset disabled={isStreaming}>
              <legend>云端隐私</legend>
              <label>
                <input
                  type="checkbox"
                  checked={persistConversation}
                  onChange={(event) => onPersistConversationChange(event.target.checked)}
                />
                <span>
                  保存本次对话
                  <small>关闭时不写入云端会话</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={privateLearningContext}
                  onChange={(event) => onPrivateLearningContextChange(event.target.checked)}
                />
                <span>
                  使用相关学习记录
                  <small>仅发送与当前问题相关的有限批注和进度</small>
                </span>
              </label>
            </fieldset>
          ) : cloudAiState === 'anonymous' ? (
            <p>
              云端隐私选项默认关闭。<a href="/learning">登录后可选择开启</a>
            </p>
          ) : cloudAiState === 'error' ? (
            <p>云端会话不可用；当前提问不会附带私有学习数据。</p>
          ) : (
            <p aria-busy="true">正在确认云端会话…</p>
          )}
        </aside>
      )}

      {selection && (
        <aside className="ai-selection-context" aria-label="当前选中文字">
          <div>
            <span>正在追问</span>
            <p>
              “{truncateUnicode(selection.text, 180)}
              {unicodeLength(selection.text) > 180 ? '…' : ''}”
            </p>
          </div>
          <button type="button" onClick={onClearSelection} aria-label="清除选区上下文">
            ×
          </button>
          <div className="ai-selection-actions">
            {[
              '解释这段',
              '用更通俗的话说',
              '为什么？',
              '结合整篇文章解释',
              '面试应该怎么回答？',
            ].map((label) => (
              <button
                key={label}
                type="button"
                disabled={isStreaming}
                onClick={() => onSend(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>
      )}

      <AIMessageList
        messages={messages}
        quickActions={quickActions}
        isStreaming={isStreaming}
        onQuickAction={onSend}
      />
      <AIComposer disabled={isStreaming} onSend={onSend} />
    </section>
  );
});
