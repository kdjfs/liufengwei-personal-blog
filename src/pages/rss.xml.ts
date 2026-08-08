import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { siteConfig } from '@/config/site';
import { PRODUCTION_SITE_URL } from '@/lib/seo';
import { getPostSlug, getPublishedPosts } from '@/utils/posts';

export async function GET(context: { site?: URL }) {
  const posts = getPublishedPosts(await getCollection('blog'));
  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site?.protocol === 'https:' ? context.site : new URL(PRODUCTION_SITE_URL),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: `/blog/${getPostSlug(post)}`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>${siteConfig.language}</language>`,
  });
}
