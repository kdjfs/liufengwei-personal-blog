import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode, KnowledgeNodeType } from './graph.ts';

export type KnowledgeFilter = 'all' | KnowledgeNodeType;

export interface PositionedKnowledgeNode extends KnowledgeNode {
  x: number;
  y: number;
}

export interface KnowledgeViewOptions {
  query: string;
  filter: KnowledgeFilter;
  selectedId?: string;
  neighborhoodOnly?: boolean;
}

const WIDTH = 1200;
const HEIGHT = 760;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const NODE_ORDER: Record<KnowledgeNodeType, number> = {
  article: 0,
  series: 1,
  category: 2,
  tag: 3,
};

function compareNodes(left: KnowledgeNode, right: KnowledgeNode): number {
  return NODE_ORDER[left.type] - NODE_ORDER[right.type] || left.id.localeCompare(right.id, 'zh-CN');
}

function pointOnRing(index: number, count: number, radius: number, offset = -Math.PI / 2) {
  const angle = offset + (Math.PI * 2 * index) / Math.max(1, count);
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  };
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function layoutKnowledgeNodes(nodes: KnowledgeNode[]): PositionedKnowledgeNode[] {
  const sorted = [...nodes].sort(compareNodes);
  const categories = sorted.filter((node) => node.type === 'category');
  const series = sorted.filter((node) => node.type === 'series');
  const tags = sorted.filter((node) => node.type === 'tag');
  const articles = sorted.filter((node) => node.type === 'article');
  const positions = new Map<string, { x: number; y: number }>();
  const categoryPositions = new Map<string, { x: number; y: number }>();

  categories.forEach((node, index) => {
    const position = pointOnRing(index, categories.length, 225);
    positions.set(node.id, position);
    categoryPositions.set(node.label, position);
  });
  series.forEach((node, index) => {
    positions.set(node.id, pointOnRing(index, series.length, 100));
  });
  tags.forEach((node, index) => {
    positions.set(node.id, pointOnRing(index, tags.length, 345));
  });

  const articleGroups = new Map<string, KnowledgeNode[]>();
  for (const article of articles) {
    const category = article.category ?? '';
    articleGroups.set(category, [...(articleGroups.get(category) ?? []), article]);
  }
  for (const [category, group] of articleGroups) {
    const anchor = categoryPositions.get(category) ?? { x: CENTER_X, y: CENTER_Y };
    group.forEach((node, index) => {
      const ring = Math.floor(index / 8);
      const positionInRing = index % 8;
      const countInRing = Math.min(8, group.length - ring * 8);
      const angle = (Math.PI * 2 * positionInRing) / Math.max(1, countInRing) + ring * 0.32;
      const radius = 46 + ring * 34;
      positions.set(node.id, {
        x: anchor.x + Math.cos(angle) * radius,
        y: anchor.y + Math.sin(angle) * radius,
      });
    });
  }

  return sorted.map((node) => {
    const position = positions.get(node.id) ?? { x: CENTER_X, y: CENTER_Y };
    return { ...node, x: rounded(position.x), y: rounded(position.y) };
  });
}

function searchText(node: KnowledgeNode): string {
  return [node.label, node.description, node.category, node.series, ...(node.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('zh-CN');
}

function connectedIds(edges: KnowledgeEdge[], selectedId?: string): Set<string> {
  const connected = new Set<string>();
  if (!selectedId) return connected;
  for (const edge of edges) {
    if (edge.source === selectedId) connected.add(edge.target);
    if (edge.target === selectedId) connected.add(edge.source);
  }
  return connected;
}

export function filterKnowledgeGraph(graph: KnowledgeGraph, options: KnowledgeViewOptions) {
  const sortedNodes = [...graph.nodes].sort(compareNodes);
  const related = connectedIds(graph.edges, options.selectedId);
  const focusedIds = new Set(related);
  if (options.selectedId) focusedIds.add(options.selectedId);

  const visibleNodes = sortedNodes.filter((node) => {
    if (options.neighborhoodOnly && options.selectedId) return focusedIds.has(node.id);
    return options.filter === 'all' || node.type === options.filter;
  });
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
  );
  const query = options.query.trim().toLocaleLowerCase('zh-CN');
  const matchedNodeIds = query
    ? visibleNodes.filter((node) => searchText(node).includes(query)).map((node) => node.id)
    : [];

  return {
    visibleNodes,
    visibleEdges,
    matchedNodeIds,
    relatedNodeIds: visibleNodes.filter((node) => related.has(node.id)).map((node) => node.id),
  };
}
