import { useEffect, useRef, useState } from 'react';
import type { SelectionContext } from '@/lib/ai/types';
import { AIChatPanel } from './AIChatPanel';
import assistantStyles from './ai-assistant.css?inline';
import {
  clampPetPosition,
  normalizePetY,
  PET_DRAG_THRESHOLD,
  PET_POSITION_KEY,
  type PetCoordinates,
  type PetViewport,
  parsePetPosition,
  restorePetPosition,
  snapPetEdge,
} from './pet-position';
import { useAIAssistant } from './use-ai-assistant';

const PET_SIZE = 82;

function viewport(): PetViewport {
  return { width: window.innerWidth, height: window.innerHeight, petSize: PET_SIZE };
}

interface AIAssistantProps {
  initialOpen?: boolean;
  initialSelection?: SelectionContext;
}

export default function AIAssistant({ initialOpen = false, initialSelection }: AIAssistantProps) {
  const assistant = useAIAssistant(initialOpen, initialSelection);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const wasStreaming = useRef(false);
  const suppressClick = useRef(false);
  const drag = useRef<
    | {
        pointerId: number;
        startX: number;
        startY: number;
        offsetX: number;
        offsetY: number;
        moved: boolean;
      }
    | undefined
  >(undefined);
  const [position, setPosition] = useState<PetCoordinates>({ edge: 'right', x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [stylesReady, setStylesReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [justReplied, setJustReplied] = useState(false);
  const [petImage, setPetImage] = useState('/mascot/ali.webp');

  useEffect(() => {
    const id = 'lfw-ai-assistant-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = assistantStyles;
      document.head.append(style);
    }
    setStylesReady(true);
  }, []);

  useEffect(() => {
    const restore = () => {
      const saved = parsePetPosition(localStorage.getItem(PET_POSITION_KEY)) ?? {
        edge: 'right' as const,
        normalizedY: 0.72,
      };
      setPosition(restorePetPosition(saved, viewport()));
      setReady(true);
    };
    restore();
    window.addEventListener('resize', restore);
    return () => window.removeEventListener('resize', restore);
  }, []);

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

  useEffect(() => {
    if (wasStreaming.current && !assistant.isStreaming) {
      setJustReplied(true);
      const timeout = window.setTimeout(() => setJustReplied(false), 900);
      wasStreaming.current = false;
      return () => window.clearTimeout(timeout);
    }
    wasStreaming.current = assistant.isStreaming;
  }, [assistant.isStreaming]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!ready || assistant.isOpen) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
    if (!active.moved && distance <= PET_DRAG_THRESHOLD) return;
    active.moved = true;
    setDragging(true);
    const next = clampPetPosition(
      { x: event.clientX - active.offsetX, y: event.clientY - active.offsetY },
      viewport(),
    );
    setPosition((current) => ({ ...current, ...next }));
  };

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = undefined;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!active.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    });
    const currentViewport = viewport();
    const released = clampPetPosition(
      { x: event.clientX - active.offsetX, y: event.clientY - active.offsetY },
      currentViewport,
    );
    const edge = snapPetEdge(released.x, currentViewport.width, PET_SIZE);
    const snapped = restorePetPosition(
      { edge, normalizedY: normalizePetY(released.y, currentViewport) },
      currentViewport,
    );
    setPosition(snapped);
    localStorage.setItem(
      PET_POSITION_KEY,
      JSON.stringify({ edge, normalizedY: normalizePetY(snapped.y, currentViewport) }),
    );
  };

  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      assistant.setIsOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], textarea:not(:disabled), input:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
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
    <div
      className={`ai-assistant ${assistant.isOpen ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''} ${assistant.isStreaming ? 'is-thinking' : ''} ${justReplied ? 'has-replied' : ''}`}
      data-edge={position.edge}
      style={stylesReady ? undefined : { visibility: 'hidden' }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="ai-trigger"
        aria-label="打开 LFW AI 助手"
        aria-expanded={assistant.isOpen}
        aria-controls="lfw-ai-panel"
        style={ready ? { left: position.x, top: position.y } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={() => {
          if (!suppressClick.current) assistant.setIsOpen(true);
        }}
      >
        <span className="ai-pet-visual" aria-hidden="true">
          <img
            src={petImage}
            width="82"
            height="82"
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setPetImage('/avatar.webp')}
          />
        </span>
        <span className="ai-trigger-label">问 AI</span>
      </button>

      {assistant.isOpen && (
        <>
          <button
            type="button"
            className="ai-scrim"
            aria-label="关闭 AI 助手背景"
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
            selection={assistant.selection}
            onClearSelection={assistant.clearSelection}
            cloudAiState={assistant.cloudAiState}
            persistConversation={assistant.persistConversation}
            privateLearningContext={assistant.privateLearningContext}
            onPersistConversationChange={assistant.setPersistConversation}
            onPrivateLearningContextChange={assistant.setPrivateLearningContext}
          />
        </>
      )}
    </div>
  );
}
