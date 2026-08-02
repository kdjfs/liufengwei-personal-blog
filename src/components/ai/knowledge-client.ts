import type { KnowledgeIndex } from '@/lib/ai/types';

let knowledgeRequest: Promise<KnowledgeIndex> | undefined;

function isKnowledgeIndex(value: unknown): value is KnowledgeIndex {
  if (!value || typeof value !== 'object') return false;
  const index = value as Partial<KnowledgeIndex>;
  return (
    index.version === 2 &&
    typeof index.fingerprint === 'string' &&
    Array.isArray(index.documents) &&
    Array.isArray(index.chunks)
  );
}

async function requestKnowledge(): Promise<KnowledgeIndex> {
  const response = await fetch('/ai-knowledge.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('KNOWLEDGE_UNAVAILABLE');
  const payload = await response.json();
  if (!isKnowledgeIndex(payload)) throw new Error('KNOWLEDGE_INVALID');
  if (import.meta.env.DEV)
    console.info('[LFW AI] Knowledge V2', {
      fingerprint: payload.fingerprint.slice(0, 8),
      ...payload.stats,
    });
  return payload;
}

export function loadKnowledge(): Promise<KnowledgeIndex> {
  knowledgeRequest ??= requestKnowledge().catch((error: unknown) => {
    knowledgeRequest = undefined;
    throw error;
  });
  return knowledgeRequest;
}
