import { forwardRef, useState } from 'react';
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
  idle: '准备连接博客知识',
  loading: '正在连接博客知识',
  ready: '已连接博客知识',
  unavailable: '博客知识暂不可用',
} as const;

function Icon({ name }: { name: 'clear' | 'settings' | 'minimize' | 'close' }) {
  const paths = {
    clear: (
      <>
        <path d="M4 6h12M8 6V4h4v2m3 0-1 10H6L5 6" />
        <path d="M8 9v4m4-4v4" />
      </>
    ),
    settings: (
      <>
        <circle cx="10" cy="10" r="2.5" />
        <path d="M16 10a6 6 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A6 6 0 0 0 12 4L11.7 1h-4L7.4 4a6 6 0 0 0-1.5.9l-2.4-1-2 3.4 2 1.5a6 6 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A6 6 0 0 0 7.4 16l.3 3h4l.3-3a6 6 0 0 0 1.5-.9l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
      </>
    ),
    minimize: <path d="M4 11h12" />,
    close: <path d="m5 5 10 10M15 5 5 15" />,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      {paths[name]}
    </svg>
  );
}

export const AIChatPanel = forwardRef<HTMLElement, Props>(function AIChatPanel(props, ref) {
  const {
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
  } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [selectionExpanded, setSelectionExpanded] = useState(false);
  const retryLast = () => {
    const previous = [...messages].reverse().find((message) => message.role === 'user');
    if (previous) onSend(previous.content);
  };

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
            <img src="/mascot/ali.webp" alt="" width="32" height="32" />
          </span>
          <div>
            <h2 id="lfw-ai-title">LFW AI</h2>
            <p>DeepSeek V4 Pro · {mode === 'deep' ? '深度' : '快速'}</p>
          </div>
        </div>
        <div className="ai-panel-actions">
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={messages.length === 0}
            aria-label="清空对话"
          >
            <Icon name="clear" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="AI 设置"
            aria-expanded={settingsOpen}
          >
            <Icon name="settings" />
          </button>
          <button type="button" onClick={onMinimize} aria-label="最小化 AI 助手">
            <Icon name="minimize" />
          </button>
          <button type="button" onClick={onClose} aria-label="关闭 AI 助手">
            <Icon name="close" />
          </button>
        </div>
        {settingsOpen && (
          <aside className="ai-settings-popover" aria-label="AI 设置选项">
            <h3>云端隐私选项</h3>
            {cloudAiState === 'authenticated' ? (
              <fieldset disabled={isStreaming}>
                <legend className="sr-only">云端隐私</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={persistConversation}
                    onChange={(event) => onPersistConversationChange(event.target.checked)}
                  />
                  <span>
                    保存本次对话<small>关闭时不写入云端会话</small>
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={privateLearningContext}
                    onChange={(event) => onPrivateLearningContextChange(event.target.checked)}
                  />
                  <span>
                    使用相关学习记录<small>只使用与问题相关的批注和进度</small>
                  </span>
                </label>
              </fieldset>
            ) : cloudAiState === 'loading' || cloudAiState === 'idle' ? (
              <p aria-busy="true">正在确认云端会话…</p>
            ) : cloudAiState === 'error' ? (
              <p>云端会话暂不可用，当前不会附带私人学习数据。</p>
            ) : (
              <p>当前未连接云端；对话和私人学习记录默认不上传。</p>
            )}
          </aside>
        )}
        {clearOpen && (
          <div className="ai-clear-confirm" role="alertdialog" aria-labelledby="ai-clear-title">
            <p id="ai-clear-title">清空当前对话？</p>
            <div>
              <button type="button" onClick={() => setClearOpen(false)} aria-label="取消清空">
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setClearOpen(false);
                }}
                aria-label="确认清空"
              >
                确认
              </button>
            </div>
          </div>
        )}
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
            快速
          </button>
          <button
            type="button"
            aria-pressed={mode === 'deep'}
            disabled={isStreaming}
            onClick={() => onModeChange('deep')}
          >
            深度
          </button>
        </fieldset>
        <p className={`ai-context-status is-${knowledgeStatus}`}>
          <i aria-hidden="true" />
          <span>{statusLabels[knowledgeStatus]}</span>
        </p>
      </div>

      {selection && (
        <aside className="ai-selection-context" aria-label="当前选中文字">
          <div>
            <span>正在追问</span>
            <p className={selectionExpanded ? 'is-expanded' : ''}>
              “{truncateUnicode(selection.text, 180)}
              {unicodeLength(selection.text) > 180 ? '…' : ''}”
            </p>
            {unicodeLength(selection.text) > 90 && (
              <button
                type="button"
                className="ai-selection-expand"
                onClick={() => setSelectionExpanded((expanded) => !expanded)}
              >
                {selectionExpanded ? '折叠' : '展开'}
              </button>
            )}
          </div>
          <button type="button" onClick={onClearSelection} aria-label="清除选区上下文">
            ×
          </button>
          <div className="ai-selection-actions">
            {['解释', '通俗解释', '为什么', '结合全文', '面试回答'].map((label) => (
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
        onRetry={retryLast}
      />
      <AIComposer isStreaming={isStreaming} onSend={onSend} onStop={onStop} />
    </section>
  );
});
