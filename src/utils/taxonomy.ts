import type { BlogEntry } from './posts';
import { sortSeriesPosts } from './series';

export interface CategorySummary {
  name: string;
  count: number;
  tags: string[];
}

export interface TagSummary {
  name: string;
  count: number;
}

export interface SeriesSummary {
  name: string;
  count: number;
  posts: BlogEntry[];
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return counts;
}

export function getCategorySummaries(posts: BlogEntry[]): CategorySummary[] {
  const grouped = new Map<string, BlogEntry[]>();
  posts.forEach((post) => {
    grouped.set(post.data.category, [...(grouped.get(post.data.category) ?? []), post]);
  });

  return [...grouped]
    .map(([name, categoryPosts]) => ({
      name,
      count: categoryPosts.length,
      tags: [...countValues(categoryPosts.flatMap((post) => post.data.tags))]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
        .slice(0, 4)
        .map(([tag]) => tag),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function getTagSummaries(posts: BlogEntry[]): TagSummary[] {
  return [...countValues(posts.flatMap((post) => post.data.tags))]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function getSeriesSummaries(posts: BlogEntry[]): SeriesSummary[] {
  const grouped = new Map<string, BlogEntry[]>();
  posts.forEach((post) => {
    if (!post.data.series) return;
    grouped.set(post.data.series, [...(grouped.get(post.data.series) ?? []), post]);
  });

  return [...grouped]
    .map(([name, seriesPosts]) => ({
      name,
      count: seriesPosts.length,
      posts: sortSeriesPosts(seriesPosts),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}
