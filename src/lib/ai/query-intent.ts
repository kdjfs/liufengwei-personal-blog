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

export function classifyQuery(
  query: string,
  index: KnowledgeIndex,
  currentUrl: string,
): { intent: QueryIntent; entities: QueryEntities } {
  const normalized = query.toLocaleLowerCase();
  const entities: QueryEntities = {
    category: matchTaxonomy(query, index.taxonomies.categories),
    tag: matchTaxonomy(query, index.taxonomies.tags),
    series: matchTaxonomy(query, index.taxonomies.series),
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
