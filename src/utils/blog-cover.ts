import type { ImageMetadata } from 'astro';

export const BLOG_COVER_NAMES = [
  '1.jpg',
  '2.jpg',
  '3.jpg',
  '4.jpg',
  '5.jpg',
  '6.jpg',
  '7.jpg',
  '8.jpg',
  '9.jpg',
  '10.jpg',
  '11.jpg',
  '12.jpg',
  '13.jpg',
  '14.jpg',
  '15.png',
] as const;

export type BlogCoverName = (typeof BLOG_COVER_NAMES)[number];

const coverModules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/blog-covers/*.{jpg,png}',
  { eager: true },
);

const coverImages = new Map<BlogCoverName, ImageMetadata>();

for (const [modulePath, module] of Object.entries(coverModules)) {
  const filename = modulePath.split('/').at(-1);
  if (filename && BLOG_COVER_NAMES.includes(filename as BlogCoverName)) {
    coverImages.set(filename as BlogCoverName, module.default);
  }
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + (hash << 6) + (hash << 16) - hash;
  }
  return hash >>> 0;
}

export function isBlogCoverName(value: string): value is BlogCoverName {
  return BLOG_COVER_NAMES.includes(value as BlogCoverName);
}

export function resolveBlogCoverName(slug: string, configuredCover?: string): BlogCoverName {
  if (configuredCover && configuredCover !== 'auto' && isBlogCoverName(configuredCover)) {
    return configuredCover;
  }
  return BLOG_COVER_NAMES[stableHash(slug) % BLOG_COVER_NAMES.length];
}

export function getBlogCover(slug: string, configuredCover?: string) {
  const name = resolveBlogCoverName(slug, configuredCover);
  const image = coverImages.get(name);
  if (!image) throw new Error(`Blog cover asset is missing: ${name}`);
  return { name, image };
}
