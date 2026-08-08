import { profile } from '../config/profile.ts';
import { siteConfig } from '../config/site.ts';

export const PRODUCTION_SITE_URL = 'https://liufengwei-personal-blog.vercel.app';

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];
export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

interface ArticleSeoInput {
  publishedTime: Date;
  updatedTime?: Date;
  category?: string;
  tags?: string[];
}

interface SeoGraphInput {
  canonical: URL;
  title: string;
  description: string;
  image: URL;
  article?: ArticleSeoInput;
}

export interface SeoGraph extends JsonLdObject {
  '@context': 'https://schema.org';
  '@graph': JsonLdObject[];
}

export function toAbsoluteUrl(value: string | URL, base: string | URL = PRODUCTION_SITE_URL): URL {
  return new URL(value, base);
}

export function createSeoGraph(input: SeoGraphInput): SeoGraph {
  const site = toAbsoluteUrl('/');
  const personId = toAbsoluteUrl('/#person').href;
  const websiteId = toAbsoluteUrl('/#website').href;
  const person: JsonLdObject = {
    '@type': 'Person',
    '@id': personId,
    name: profile.name,
    url: toAbsoluteUrl('/about').href,
    image: toAbsoluteUrl(profile.avatar).href,
    sameAs: profile.socials.filter((social) => social.external).map((social) => social.href),
    jobTitle: profile.role,
  };
  const website: JsonLdObject = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: site.href,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    author: { '@id': personId },
  };
  const graph: JsonLdObject[] = [website, person];

  if (input.article) {
    graph.push(
      {
        '@type': 'BlogPosting',
        '@id': `${input.canonical.href}#article`,
        mainEntityOfPage: input.canonical.href,
        headline: input.title,
        description: input.description,
        image: [input.image.href],
        datePublished: input.article.publishedTime.toISOString(),
        dateModified: (input.article.updatedTime ?? input.article.publishedTime).toISOString(),
        author: { '@id': personId },
        publisher: { '@id': personId },
        articleSection: input.article.category,
        keywords: input.article.tags,
        inLanguage: siteConfig.language,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${input.canonical.href}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: site.href },
          { '@type': 'ListItem', position: 2, name: '文章', item: toAbsoluteUrl('/blog').href },
          { '@type': 'ListItem', position: 3, name: input.title, item: input.canonical.href },
        ],
      },
    );
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
