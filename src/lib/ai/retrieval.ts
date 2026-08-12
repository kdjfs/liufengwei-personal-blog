import { classifyQuery, type QueryEntities, type QueryIntent } from './query-intent.ts';
import type { KnowledgeChunk, KnowledgeDocument, KnowledgeIndex, KnowledgeItem } from './types.ts';

export interface RankedKnowledge {
  item: KnowledgeItem;
  score: number;
}
export interface RetrievalResult {
  intent: QueryIntent;
  entities: QueryEntities;
  facts?: string;
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  sources: KnowledgeDocument[];
  queryTerms: string[];
  confidence: 'high' | 'medium' | 'low';
  fastAnswer?: string;
}
const STOP_TERMS = new Set([
  '一下',
  '这个',
  '那个',
  '请问',
  '帮我',
  '可以',
  '怎么',
  '什么',
  '文章',
  '分类',
  '所有',
  '全部',
  '哪些',
  '多少',
  '几篇',
  'where',
  'which',
  'post',
  'article',
  'about',
  'learn',
  'explains',
]);
const SYNONYMS: Record<string, string[]> = {
  avalanche: ['雪崩'],
  penetration: ['穿透'],
  breakdown: ['击穿'],
  lock: ['锁'],
  row: ['行'],
  key: ['键'],
};
function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/([\p{Script=Latin}])(\p{Script=Han})/gu, '$1 $2')
    .replace(/(\p{Script=Han})([\p{Script=Latin}])/gu, '$1 $2')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}
export function buildTerms(query: string): string[] {
  const terms = new Set<string>();
  const segmenter =
    typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
      : undefined;
  const tokens = segmenter
    ? [...segmenter.segment(normalize(query))].map((part) => part.segment)
    : normalize(query).split(/\s+/);
  for (const token of tokens) {
    if (token.length < 2 || STOP_TERMS.has(token)) continue;
    terms.add(token);
    for (const synonym of SYNONYMS[token] ?? []) terms.add(synonym);
    if (/^\p{Script=Han}+$/u.test(token) && token.length > 2)
      for (let i = 0; i < token.length - 1; i += 1) terms.add(token.slice(i, i + 2));
  }
  return [...terms];
}
function score(value: string | string[], terms: string[], weight: number): number {
  const normalized = normalize(Array.isArray(value) ? value.join(' ') : value);
  return terms.reduce((total, term) => total + (normalized.includes(term) ? weight : 0), 0);
}
export function rankKnowledge(
  query: string,
  items: readonly KnowledgeItem[],
  limit = 4,
): RankedKnowledge[] {
  const terms = buildTerms(query);
  return items
    .map((item) => ({
      item,
      score:
        score(item.title, terms, 8) +
        score(item.tags, terms, 6) +
        score(item.category, terms, 5) +
        score(item.description, terms, 3) +
        score(item.excerpt, terms, 1),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, Math.max(0, limit));
}
export function selectKnowledgeSources(
  query: string,
  items: readonly KnowledgeItem[],
  currentUrl: string,
  limit = 4,
): KnowledgeItem[] {
  const current = items.find((item) => item.type === 'article' && item.url === currentUrl);
  return [current, ...rankKnowledge(query, items, limit).map((entry) => entry.item)]
    .filter((item): item is KnowledgeItem => Boolean(item))
    .filter((item, index, values) => values.findIndex((value) => value.id === item.id) === index)
    .slice(0, limit);
}
function matchingDocuments(index: KnowledgeIndex, entities: QueryEntities): KnowledgeDocument[] {
  const ids = entities.category
    ? index.taxonomies.categories.find((item) => item.name === entities.category)?.articleIds
    : entities.tag
      ? index.taxonomies.tags.find((item) => item.name === entities.tag)?.articleIds
      : entities.series
        ? index.taxonomies.series.find((item) => item.name === entities.series)?.articleIds
        : undefined;
  return ids
    ? ids
        .map((id) => index.documents.find((document) => document.id === id))
        .filter((document): document is KnowledgeDocument => Boolean(document))
        .sort((a, b) =>
          entities.series
            ? (a.seriesOrder ?? Number.MAX_SAFE_INTEGER) -
              (b.seriesOrder ?? Number.MAX_SAFE_INTEGER)
            : 0,
        )
    : [];
}
function formatFacts(label: string, documents: KnowledgeDocument[]): string {
  return [
    `${label}：${documents.length} 篇文章`,
    ...documents.map((document, index) => `${index + 1}. ${document.title} (${document.url})`),
  ].join('\n');
}
function formatFastAnswer(label: string, documents: KnowledgeDocument[], list: boolean): string {
  return list ? `${formatFacts(label, documents)}` : `${label}目前有 ${documents.length} 篇文章。`;
}
export function retrieveKnowledge(
  query: string,
  index: KnowledgeIndex,
  currentUrl: string,
): RetrievalResult {
  const { intent, entities } = classifyQuery(query, index, currentUrl);
  const queryTerms = buildTerms(query);
  const entityDocuments = matchingDocuments(index, entities);
  if (intent === 'metadata_count' || intent === 'metadata_list') {
    const label = entities.category
      ? `${entities.category}分类`
      : entities.tag
        ? `${entities.tag}标签`
        : `${entities.series}系列`;
    return {
      intent,
      entities,
      facts: formatFacts(label, entityDocuments),
      documents: entityDocuments,
      chunks: [],
      sources: entityDocuments,
      queryTerms,
      confidence: 'high',
      fastAnswer: formatFastAnswer(label, entityDocuments, intent === 'metadata_list'),
    };
  }
  const chapterDocuments =
    intent === 'chapter_lookup'
      ? index.documents.filter(
          (document) =>
            document.type === 'article' &&
            new RegExp(`第\\s*${entities.chapter}\\s*章`, 'iu').test(document.title),
        )
      : [];
  const rankedChunks =
    intent === 'current_article'
      ? index.chunks.filter((chunk) => chunk.url.split('#')[0] === currentUrl).slice(0, 4)
      : index.chunks
          .map((chunk) => ({
            chunk,
            score:
              score(chunk.heading ?? '', queryTerms, 10) +
              score(chunk.headingPath, queryTerms, 7) +
              score(chunk.text, queryTerms, 2) +
              score(chunk.articleTitle, queryTerms, 25),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map((entry) => entry.chunk);
  const documents = chapterDocuments.length
    ? chapterDocuments
    : rankedChunks
        .map((chunk) => index.documents.find((document) => document.id === chunk.articleId))
        .filter((document): document is KnowledgeDocument => Boolean(document))
        .filter(
          (document, position, values) =>
            values.findIndex((value) => value.id === document.id) === position,
        );
  const current = index.documents.find((document) => document.url === currentUrl);
  const sources = [...(current && intent === 'current_article' ? [current] : []), ...documents]
    .filter(
      (document, position, values) =>
        values.findIndex((value) => value.id === document.id) === position,
    )
    .slice(0, 4);
  return {
    intent,
    entities,
    documents,
    chunks: rankedChunks,
    sources,
    queryTerms,
    confidence: documents.length || rankedChunks.length ? 'medium' : 'low',
  };
}
