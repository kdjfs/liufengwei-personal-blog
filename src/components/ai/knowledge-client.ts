import type { KnowledgeIndex, KnowledgeItem } from '@/lib/ai/types';

let knowledgeRequest: Promise<KnowledgeItem[]> | undefined;

function isKnowledgeItem(value: unknown): value is KnowledgeItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<KnowledgeItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.url === 'string' &&
    item.url.startsWith('/') &&
    typeof item.excerpt === 'string' &&
    Array.isArray(item.tags)
  );
}

async function requestKnowledge(): Promise<KnowledgeItem[]> {
  const response = await fetch('/ai-knowledge.json', { cache: 'force-cache' });
  if (!response.ok) throw new Error('KNOWLEDGE_UNAVAILABLE');
  const payload = (await response.json()) as Partial<KnowledgeIndex>;
  if (payload.version !== 1 || !Array.isArray(payload.items)) {
    throw new Error('KNOWLEDGE_INVALID');
  }
  return payload.items.filter(isKnowledgeItem);
}

export function loadKnowledge(): Promise<KnowledgeItem[]> {
  knowledgeRequest ??= requestKnowledge().catch((error: unknown) => {
    knowledgeRequest = undefined;
    throw error;
  });
  return knowledgeRequest;
}
