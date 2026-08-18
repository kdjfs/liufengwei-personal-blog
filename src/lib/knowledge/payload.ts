import type {
  KnowledgeEdge,
  KnowledgeEdgeType,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeNodeType,
} from './graph.ts';

const NODE_TYPES = new Set<KnowledgeNodeType>(['article', 'category', 'tag', 'series']);
const EDGE_TYPES = new Set<KnowledgeEdgeType>(['category', 'tag', 'series', 'related']);
const MAX_NODES = 10_000;
const MAX_EDGES = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function taxonomyRoute(type: Exclude<KnowledgeNodeType, 'article'>): string {
  return type === 'category' ? 'categories' : type === 'series' ? 'series' : 'tags';
}

function isKnowledgeNode(value: unknown): value is KnowledgeNode {
  if (!isRecord(value) || !NODE_TYPES.has(value.type as KnowledgeNodeType)) return false;
  const type = value.type as KnowledgeNodeType;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.label)) return false;
  if (!isNonEmptyString(value.href)) return false;
  if (!isOptionalString(value.description) || !isOptionalString(value.category)) return false;
  if (!isOptionalString(value.series)) return false;
  if (value.tags !== undefined && !isStringArray(value.tags)) return false;
  if (
    value.seriesOrder !== undefined &&
    (!Number.isInteger(value.seriesOrder) || Number(value.seriesOrder) <= 0)
  ) {
    return false;
  }

  if (type === 'article') {
    if (!isNonEmptyString(value.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
      return false;
    }
    if (
      !isNonEmptyString(value.description) ||
      !isNonEmptyString(value.category) ||
      !isStringArray(value.tags) ||
      value.tags.length === 0
    ) {
      return false;
    }
    const hasSeries = value.series !== undefined;
    const hasSeriesOrder = value.seriesOrder !== undefined;
    if (hasSeries !== hasSeriesOrder || (hasSeries && !isNonEmptyString(value.series)))
      return false;
    return value.id === `article:${value.slug}` && value.href === `/blog/${value.slug}`;
  }

  const encodedLabel = encodeURIComponent(value.label);
  return (
    value.id === `${type}:${encodedLabel}` &&
    value.href === `/${taxonomyRoute(type)}/${encodedLabel}`
  );
}

function isKnowledgeEdge(value: unknown): value is KnowledgeEdge {
  if (!isRecord(value) || !EDGE_TYPES.has(value.type as KnowledgeEdgeType)) return false;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.source) ||
    !isNonEmptyString(value.target)
  ) {
    return false;
  }
  return value.id === `${value.type}:${value.source}->${value.target}`;
}

function edgeConnectsExpectedTypes(
  edge: KnowledgeEdge,
  nodesById: Map<string, KnowledgeNode>,
): boolean {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target || source.type !== 'article') return false;
  return edge.type === 'related' ? target.type === 'article' : target.type === edge.type;
}

function isGraphStats(value: unknown, nodes: KnowledgeNode[], edges: KnowledgeEdge[]): boolean {
  if (!isRecord(value)) return false;
  const expected = {
    articleCount: nodes.filter((node) => node.type === 'article').length,
    categoryCount: nodes.filter((node) => node.type === 'category').length,
    tagCount: nodes.filter((node) => node.type === 'tag').length,
    seriesCount: nodes.filter((node) => node.type === 'series').length,
    edgeCount: edges.length,
  };
  return Object.entries(expected).every(
    ([key, count]) => Number.isInteger(value[key]) && value[key] === count,
  );
}

export function isKnowledgeGraphPayload(value: unknown): value is KnowledgeGraph {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!Array.isArray(value.nodes) || value.nodes.length > MAX_NODES) return false;
  if (!Array.isArray(value.edges) || value.edges.length > MAX_EDGES) return false;
  if (!value.nodes.every(isKnowledgeNode) || !value.edges.every(isKnowledgeEdge)) return false;

  const nodes = value.nodes as KnowledgeNode[];
  const edges = value.edges as KnowledgeEdge[];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  if (nodesById.size !== nodes.length) return false;
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length) return false;
  if (!edges.every((edge) => edgeConnectsExpectedTypes(edge, nodesById))) return false;
  return isGraphStats(value.stats, nodes, edges);
}
