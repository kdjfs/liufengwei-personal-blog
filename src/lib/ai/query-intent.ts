import type { KnowledgeIndex, KnowledgeTaxonomy } from './types.ts';

export type QueryIntent =
  | 'metadata_count'
  | 'metadata_list'
  | 'exact_article'
  | 'chapter_lookup'
  | 'content_search'
  | 'current_article'
  | 'profile'
  | 'project'
  | 'unknown';
export interface QueryEntities {
  category?: string;
  tag?: string;
  series?: string;
  chapter?: string;
}

function matchTaxonomy(query: string, values: KnowledgeTaxonomy[]): string | undefined {
  return values
    .map((item) => item.name)
    .filter((name) => query.toLocaleLowerCase().includes(name.toLocaleLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
}

function matchSeries(query: string, values: KnowledgeTaxonomy[]): string | undefined {
  const normalized = query.toLocaleLowerCase();
  const candidates = values
    .map((item) => item.name)
    .map((name) => ({
      name,
      tokens: name
        .toLocaleLowerCase()
        .replace(/(?:前端|后端)?(?:系列|教程|学习|速成)/gu, ' ')
        .split(/[\s·/、与和+_-]+/u)
        .filter((token) => token.length >= 2),
    }))
    .filter(
      ({ name, tokens }) =>
        normalized.includes(name.toLocaleLowerCase()) ||
        (tokens.length >= 2 && tokens.every((token) => normalized.includes(token))),
    )
    .sort((a, b) => b.tokens.length - a.tokens.length || b.name.length - a.name.length);
  return candidates.length === 1 ? candidates[0]?.name : undefined;
}

export function classifyQuery(
  query: string,
  index: KnowledgeIndex,
  currentUrl: string,
): { intent: QueryIntent; entities: QueryEntities } {
  const normalized = query.toLocaleLowerCase();
  const series = matchSeries(query, index.taxonomies.series);
  const entities: QueryEntities = {
    category: matchTaxonomy(query, index.taxonomies.categories),
    tag: series ? undefined : matchTaxonomy(query, index.taxonomies.tags),
    series,
  };
  const chapter =
    query.match(/第\s*([一二三四五六七八九十百\d]+)\s*章|chapter\s*(\d+)/iu)?.[1] ??
    query.match(/chapter\s*(\d+)/iu)?.[1];
  if (chapter) entities.chapter = chapter;
  const hasCount = /多少|几篇|数量|count|how many/i.test(normalized);
  const hasList =
    /哪些|哪几|列出|列表|全部|所有|list|which (?:article|post)|what (?:article|post)/i.test(
      normalized,
    );
  const hasEntity = Boolean(entities.category || entities.tag || entities.series);
  if (hasEntity && hasCount) return { intent: 'metadata_count', entities };
  if (hasEntity && hasList) return { intent: 'metadata_list', entities };
  if (chapter) return { intent: 'chapter_lookup', entities };
  if (
    currentUrl.startsWith('/blog/') &&
    /这[一篇章节文]|this (?:article|post|chapter)/i.test(normalized)
  )
    return { intent: 'current_article', entities };
  if (/项目|project/i.test(normalized)) return { intent: 'project', entities };
  if (/作者|个人|经历|profile|about/i.test(normalized)) return { intent: 'profile', entities };
  return { intent: 'content_search', entities };
}
