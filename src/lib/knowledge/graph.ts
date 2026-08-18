export type KnowledgeNodeType = 'article' | 'category' | 'tag' | 'series';
export type KnowledgeEdgeType = 'category' | 'tag' | 'series' | 'related';

export interface KnowledgeGraphArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  series?: string;
  seriesOrder?: number;
  draft?: boolean;
}

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  slug?: string;
  href: string;
  description?: string;
  category?: string;
  tags?: string[];
  series?: string;
  seriesOrder?: number;
}

export interface KnowledgeEdge {
  id: string;
  type: KnowledgeEdgeType;
  source: string;
  target: string;
}

export interface KnowledgeGraph {
  version: 1;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  stats: {
    articleCount: number;
    categoryCount: number;
    tagCount: number;
    seriesCount: number;
    edgeCount: number;
  };
}

const NODE_ORDER: Record<KnowledgeNodeType, number> = {
  article: 0,
  series: 1,
  category: 2,
  tag: 3,
};

const EDGE_ORDER: Record<KnowledgeEdgeType, number> = {
  category: 0,
  series: 1,
  tag: 2,
  related: 3,
};

function cleanLabel(value: string, field: string): string {
  const label = value.trim();
  if (!label) throw new Error(`Knowledge graph ${field} requires a non-empty label`);
  return label;
}

function taxonomyId(type: Exclude<KnowledgeNodeType, 'article'>, label: string): string {
  return `${type}:${encodeURIComponent(label)}`;
}

function taxonomyHref(type: Exclude<KnowledgeNodeType, 'article'>, label: string): string {
  const route = type === 'category' ? 'categories' : type === 'series' ? 'series' : 'tags';
  return `/${route}/${encodeURIComponent(label)}`;
}

function compareNodes(left: KnowledgeNode, right: KnowledgeNode): number {
  return NODE_ORDER[left.type] - NODE_ORDER[right.type] || left.id.localeCompare(right.id, 'zh-CN');
}

function compareEdges(left: KnowledgeEdge, right: KnowledgeEdge): number {
  return (
    EDGE_ORDER[left.type] - EDGE_ORDER[right.type] ||
    left.source.localeCompare(right.source, 'zh-CN') ||
    left.target.localeCompare(right.target, 'zh-CN')
  );
}

export function buildKnowledgeGraph(input: KnowledgeGraphArticle[]): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();

  const addTaxonomyNode = (
    type: Exclude<KnowledgeNodeType, 'article'>,
    rawLabel: string,
  ): KnowledgeNode => {
    const label = cleanLabel(rawLabel, type);
    const id = taxonomyId(type, label);
    const existing = nodes.get(id);
    if (existing) return existing;
    const node = { id, type, label, href: taxonomyHref(type, label) } satisfies KnowledgeNode;
    nodes.set(id, node);
    return node;
  };

  const addEdge = (type: KnowledgeEdgeType, source: string, target: string) => {
    const id = `${type}:${source}->${target}`;
    if (!edges.has(id)) edges.set(id, { id, type, source, target });
  };

  for (const rawArticle of input) {
    if (rawArticle.draft) continue;

    const slug = rawArticle.slug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Invalid article slug: ${rawArticle.slug}`);
    }
    const id = `article:${slug}`;
    if (nodes.has(id)) throw new Error(`Duplicate article slug: ${slug}`);

    const title = cleanLabel(rawArticle.title, 'article');
    const description = cleanLabel(rawArticle.description, 'description');
    const category = cleanLabel(rawArticle.category, 'category');
    const tags = [...new Set(rawArticle.tags.map((tag) => cleanLabel(tag, 'tag')))];
    if (tags.length === 0) throw new Error(`Article ${slug} requires at least one tag`);

    const series = rawArticle.series ? cleanLabel(rawArticle.series, 'series') : undefined;
    if (
      series &&
      (!Number.isInteger(rawArticle.seriesOrder) || (rawArticle.seriesOrder ?? 0) <= 0)
    ) {
      throw new Error(`Article ${slug} requires a positive integer seriesOrder`);
    }
    if (!series && rawArticle.seriesOrder !== undefined) {
      throw new Error(`Article ${slug} cannot define seriesOrder without series`);
    }

    nodes.set(id, {
      id,
      type: 'article',
      label: title,
      slug,
      href: `/blog/${slug}`,
      description,
      category,
      tags,
      ...(series ? { series, seriesOrder: rawArticle.seriesOrder } : {}),
    });

    const categoryNode = addTaxonomyNode('category', category);
    addEdge('category', id, categoryNode.id);

    for (const tag of tags) {
      const tagNode = addTaxonomyNode('tag', tag);
      addEdge('tag', id, tagNode.id);
    }

    if (series) {
      const seriesNode = addTaxonomyNode('series', series);
      addEdge('series', id, seriesNode.id);
    }
  }

  const sortedNodes = [...nodes.values()].sort(compareNodes);
  const sortedEdges = [...edges.values()].sort(compareEdges);
  const count = (type: KnowledgeNodeType) =>
    sortedNodes.filter((node) => node.type === type).length;

  return {
    version: 1,
    nodes: sortedNodes,
    edges: sortedEdges,
    stats: {
      articleCount: count('article'),
      categoryCount: count('category'),
      tagCount: count('tag'),
      seriesCount: count('series'),
      edgeCount: sortedEdges.length,
    },
  };
}
