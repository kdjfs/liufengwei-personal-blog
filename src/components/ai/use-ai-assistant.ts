import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { selectKnowledgeSources } from '@/lib/ai/retrieval';
import type { ChatMode, KnowledgeItem } from '@/lib/ai/types';
import { AIChatClientError, streamAIResponse } from './chat-client';
import { loadKnowledge } from './knowledge-client';
import { isArticlePage, readCurrentPageContext } from './page-context';
import { articleQuickActions, generalQuickActions } from './quick-actions';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'done' | 'streaming' | 'error';
  sources?: KnowledgeItem[];
}

type KnowledgeStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return '';
  if (!(error instanceof AIChatClientError)) return 'AI 服务暂时不可用，请稍后重试。';

  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local && ['ENDPOINT_UNAVAILABLE', 'AI_NOT_CONFIGURED'].includes(error.code)) {
    return 'AI 服务需要 pnpm dev:ai 或线上环境';
  }
  if (error.code === 'RATE_LIMITED') return '提问有点频繁，请稍后再试。';
  if (error.code === 'AI_TIMEOUT') return '这次思考超时了，请重试或切换到快速模式。';
  const message = error.message || 'AI 服务暂时不可用，请稍后重试。';
  return error.requestId ? `${message}\n\n请求 ID：${error.requestId}` : message;
}

export function useAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('fast');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [articlePage, setArticlePage] = useState(false);
  const [knowledgeStatus, setKnowledgeStatus] = useState<KnowledgeStatus>('idle');
  const abortRef = useRef<AbortController | undefined>(undefined);
  const streamingRef = useRef(false);

  useEffect(() => {
    const syncPage = () => setArticlePage(isArticlePage());
    syncPage();
    document.addEventListener('astro:page-load', syncPage);
    return () => document.removeEventListener('astro:page-load', syncPage);
  }, []);

  useEffect(() => {
    if (!isOpen || knowledgeStatus !== 'idle') return;
    setKnowledgeStatus('loading');
    loadKnowledge().then(
      () => setKnowledgeStatus('ready'),
      () => setKnowledgeStatus('unavailable'),
    );
  }, [isOpen, knowledgeStatus]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || streamingRef.current) return;

      streamingRef.current = true;
      setIsStreaming(true);
      const currentPage = readCurrentPageContext();
      let knowledge: KnowledgeItem[] = [];
      try {
        knowledge = await loadKnowledge();
        setKnowledgeStatus('ready');
      } catch {
        setKnowledgeStatus('unavailable');
      }

      const sources = selectKnowledgeSources(question, knowledge, currentPage.url, 4);
      const userMessage: DisplayMessage = {
        id: createId(),
        role: 'user',
        content: question,
        status: 'done',
      };
      const assistantId = createId();
      const assistantMessage: DisplayMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        sources,
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);

      const controller = new AbortController();
      abortRef.current = controller;
      let received = '';
      try {
        await streamAIResponse(
          {
            mode,
            messages: [
              ...messages
                .filter((message) => message.status === 'done')
                .slice(-10)
                .map(({ role, content }) => ({ role, content })),
              { role: 'user', content: question },
            ],
            context: sources.map((source) => ({
              id: source.id,
              title: source.title,
              url: source.url,
              category: source.category,
              excerpt: source.excerpt,
            })),
            currentPage,
          },
          (delta) => {
            received += delta;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${delta}` }
                  : message,
              ),
            );
          },
          controller.signal,
        );

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: received || '这次没有收到有效回答，请重试。',
                  status: received ? 'done' : 'error',
                }
              : message,
          ),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    content: received || '已停止生成。',
                    status: 'done',
                  }
                : item,
            ),
          );
        }
        const message = friendlyError(error);
        if (message) {
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId ? { ...item, content: message, status: 'error' } : item,
            ),
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = undefined;
        streamingRef.current = false;
        setIsStreaming(false);
      }
    },
    [messages, mode],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    streamingRef.current = false;
    setIsStreaming(false);
    setMessages([]);
  }, []);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  return {
    isOpen,
    setIsOpen,
    mode,
    setMode,
    messages,
    isStreaming,
    knowledgeStatus,
    quickActions: useMemo(
      () => (articlePage ? articleQuickActions : generalQuickActions),
      [articlePage],
    ),
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
