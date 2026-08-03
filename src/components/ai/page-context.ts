import type { CurrentPageContext } from '@/lib/ai/types';

function truncate(value: string, maxChars: number): string {
  return Array.from(value.replace(/\s+/g, ' ').trim()).slice(0, maxChars).join('');
}

function readTags(value?: string): string[] | undefined {
  if (!value) return undefined;
  try {
    const tags = JSON.parse(value) as unknown;
    return Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined;
  } catch {
    return undefined;
  }
}

export function isArticlePage(): boolean {
  return Boolean(document.querySelector('[data-ai-article]'));
}

export function readCurrentPageContext(): CurrentPageContext {
  const article = document.querySelector<HTMLElement>('[data-ai-article]');
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const fallbackTitle = document.querySelector('h1')?.textContent || document.title.split('｜')[0];

  if (!article) {
    return {
      title: truncate(fallbackTitle, 180),
      url: `${location.pathname}${location.search}`,
      description: truncate(metaDescription?.content ?? '', 300) || undefined,
    };
  }

  const content = article.querySelector<HTMLElement>('.prose')?.innerText ?? '';
  const activeHeading = document.querySelector<HTMLElement>('[data-current-heading]')?.textContent;
  const readingProgress = Number(article.dataset.learningProgress);
  return {
    title: truncate(article.dataset.aiTitle || fallbackTitle, 180),
    url: article.dataset.aiUrl || location.pathname,
    description: truncate(article.dataset.aiDescription ?? '', 300) || undefined,
    category: truncate(article.dataset.aiCategory ?? '', 60) || undefined,
    tags: readTags(article.dataset.aiTags)?.slice(0, 8),
    content: truncate(content, 6000) || undefined,
    activeHeading: activeHeading ? truncate(activeHeading, 300) : undefined,
    readingProgress: Number.isFinite(readingProgress) ? readingProgress : undefined,
  };
}
