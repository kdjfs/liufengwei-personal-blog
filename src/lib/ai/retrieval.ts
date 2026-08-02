import type { KnowledgeItem } from './types.ts';

export interface RankedKnowledge {
  item: KnowledgeItem;
  score: number;
}

const FIELD_WEIGHTS = {
  title: 8,
  tags: 6,
  category: 5,
  description: 3,
  excerpt: 1,
} as const;

const STOP_TERMS = new Set(['一下', '这个', '那个', '请问', '帮我', '可以', '怎么', '什么']);

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function buildTerms(query: string): string[] {
  const normalized = normalize(query);
  const terms = new Set<string>();

  for (const token of normalized.split(/\s+/)) {
    if (token.length < 2 || STOP_TERMS.has(token)) continue;
    terms.add(token);
    if (/^\p{Script=Han}+$/u.test(token) && token.length > 2) {
      const characters = Array.from(token);
      for (let index = 0; index < characters.length - 1; index += 1) {
        const pair = characters.slice(index, index + 2).join('');
        if (!STOP_TERMS.has(pair)) terms.add(pair);
      }
    }
  }

  return [...terms];
}

function scoreField(value: string | readonly string[], terms: string[], weight: number): number {
  const normalized = normalize(typeof value === 'string' ? value : value.join(' '));
  return terms.reduce((score, term) => score + (normalized.includes(term) ? weight : 0), 0);
}

export function rankKnowledge(
  query: string,
  items: readonly KnowledgeItem[],
  limit = 4,
): RankedKnowledge[] {
  const terms = buildTerms(query);
  if (terms.length === 0) return [];

  return items
    .map((item) => ({
      item,
      score:
        scoreField(item.title, terms, FIELD_WEIGHTS.title) +
        scoreField(item.tags, terms, FIELD_WEIGHTS.tags) +
        scoreField(item.category, terms, FIELD_WEIGHTS.category) +
        scoreField(item.description, terms, FIELD_WEIGHTS.description) +
        scoreField(item.excerpt, terms, FIELD_WEIGHTS.excerpt),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
    .slice(0, Math.max(0, limit));
}
