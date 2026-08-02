import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { profile } from '@/config/profile';
import { projects } from '@/data/projects';
import { timeline } from '@/data/timeline';
import { createKnowledgeItems } from '@/lib/ai/knowledge';
import type { KnowledgeIndex } from '@/lib/ai/types';
import { getPublishedPosts } from '@/utils/posts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = getPublishedPosts(await getCollection('blog'));
  const knowledge: KnowledgeIndex = {
    version: 1,
    items: createKnowledgeItems({ posts, profile, projects, timeline }),
  };

  return new Response(JSON.stringify(knowledge), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
