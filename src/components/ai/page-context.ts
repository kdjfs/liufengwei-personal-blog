import { CHAT_LIMITS, type CurrentPageContext, truncateUnicode } from '@/lib/ai/chat-contract';

function truncate(value: string, maxChars: number): string {
  return truncateUnicode(value.replace(/\s+/g, ' ').trim(), maxChars);
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
      title: truncate(fallbackTitle, CHAT_LIMITS.currentPageTitle),
      url: `${location.pathname}${location.search}`,
      description:
        truncate(metaDescription?.content ?? '', CHAT_LIMITS.currentPageDescription) || undefined,
    };
  }

  const content = article.querySelector<HTMLElement>('.prose')?.innerText ?? '';
  const activeHeading = document.querySelector<HTMLElement>('[data-current-heading]')?.textContent;
  const readingProgress = Number(article.dataset.learningProgress);
  return {
    title: truncate(article.dataset.aiTitle || fallbackTitle, CHAT_LIMITS.currentPageTitle),
    url: article.dataset.aiUrl || location.pathname,
    description:
      truncate(article.dataset.aiDescription ?? '', CHAT_LIMITS.currentPageDescription) ||
      undefined,
    category:
      truncate(article.dataset.aiCategory ?? '', CHAT_LIMITS.currentPageCategory) || undefined,
    tags: readTags(article.dataset.aiTags)
      ?.slice(0, CHAT_LIMITS.currentPageTags)
      .map((tag) => truncate(tag, CHAT_LIMITS.currentPageTag)),
    content: truncate(content, CHAT_LIMITS.currentPageContent) || undefined,
    activeHeading: activeHeading
      ? truncate(activeHeading, CHAT_LIMITS.currentPageActiveHeading)
      : undefined,
    readingProgress: Number.isFinite(readingProgress) ? readingProgress : undefined,
  };
}
