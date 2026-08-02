import { useEffect, useRef } from 'react';
import { AIChatPanel } from './AIChatPanel';
import { useAIAssistant } from './use-ai-assistant';
import './ai-assistant.css';

export default function AIAssistant() {
  const assistant = useAIAssistant();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (assistant.isOpen) {
      window.requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      });
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
    }
    wasOpen.current = assistant.isOpen;
  }, [assistant.isOpen]);

  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      assistant.setIsOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], textarea:not(:disabled)',
      ) ?? []),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`ai-assistant ${assistant.isOpen ? 'is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="ai-trigger"
        aria-label="打开 LFW AI 助手"
        aria-expanded={assistant.isOpen}
        aria-controls="lfw-ai-panel"
        onClick={() => assistant.setIsOpen(true)}
      >
        <span className="ai-trigger-icon" aria-hidden="true">
          ✦
        </span>
        <span className="ai-trigger-label">ASK AI</span>
      </button>

      {assistant.isOpen && (
        <>
          <button
            type="button"
            className="ai-scrim"
            aria-label="关闭 AI 助手"
            onClick={() => assistant.setIsOpen(false)}
          />
          <AIChatPanel
            ref={panelRef}
            mode={assistant.mode}
            messages={assistant.messages}
            quickActions={assistant.quickActions}
            isStreaming={assistant.isStreaming}
            knowledgeStatus={assistant.knowledgeStatus}
            onModeChange={assistant.setMode}
            onSend={assistant.sendMessage}
            onStop={assistant.stopStreaming}
            onClear={assistant.clearMessages}
            onMinimize={() => assistant.setIsOpen(false)}
            onClose={() => assistant.setIsOpen(false)}
            onKeyDown={handlePanelKeyDown}
          />
        </>
      )}
    </div>
  );
}
