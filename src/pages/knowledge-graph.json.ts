import { getCollection } from 'astro:content';
import { buildKnowledgeGraph } from '@/lib/knowledge/graph';

export const prerender = true;

export async function GET() {
  const posts = await getCollection('blog');
  const graph = buildKnowledgeGraph(
    posts.map(({ data }) => ({
      slug: data.slug,
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags,
      series: data.series,
      seriesOrder: data.seriesOrder,
      draft: data.draft,
    })),
  );

  return new Response(JSON.stringify(graph), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
