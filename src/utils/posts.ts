import type { CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';

export type BlogEntry = CollectionEntry<'blog'>;

export function getPostSlug(post: BlogEntry): string {
  return post.id.replace(/\.(md|mdx)$/i, '');
}

export function sortPosts(posts: BlogEntry[]): BlogEntry[] {
  return [...posts].sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

export function getPublishedPosts(posts: BlogEntry[]): BlogEntry[] {
  return sortPosts(posts.filter((post) => !post.data.draft));
}

export function getReadingStats(body: string) {
  const stats = readingTime(body);
  const words = Math.max(1, stats.words);
  return { words, minutes: Math.max(1, Math.ceil(stats.minutes)) };
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getRelatedPosts(current: BlogEntry, posts: BlogEntry[], limit = 3): BlogEntry[] {
  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      const sharedTags = post.data.tags.filter((tag) => current.data.tags.includes(tag)).length;
      const categoryScore = post.data.category === current.data.category ? 3 : 0;
      return { post, score: sharedTags * 2 + categoryScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
