import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeGraph } from '@/lib/knowledge/graph';
import {
  buildLearningOverlay,
  type KnowledgeLearningOverlay,
  summarizeLearningOverlay,
} from '@/lib/knowledge/learning-overlay';
import { isKnowledgeGraphPayload } from '@/lib/knowledge/payload';
import {
  filterKnowledgeGraph,
  type KnowledgeFilter,
  layoutKnowledgeNodes,
  type PositionedKnowledgeNode,
} from '@/lib/knowledge/view';
import KnowledgeGraphCanvas from './KnowledgeGraphCanvas';
import KnowledgeGraphDetail from './KnowledgeGraphDetail';
import KnowledgeGraphList from './KnowledgeGraphList';
import KnowledgeGraphToolbar from './KnowledgeGraphToolbar';

export default function KnowledgeGraphExperience() {
  const [graph, setGraph] = useState<KnowledgeGraph>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<KnowledgeFilter>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const [neighborhoodOnly, setNeighborhoodOnly] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [learningOverlay, setLearningOverlay] = useState<KnowledgeLearningOverlay>({});
  const [learningAvailable, setLearningAvailable] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/knowledge-graph.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload: unknown = await response.json();
        if (!isKnowledgeGraphPayload(payload)) throw new Error('invalid graph payload');
        setGraph(payload);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        console.error('[LFW Graph] Public graph failed to load', reason);
        setError('知识图谱暂时无法加载');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!graph) return;
    let active = true;
    const articleSlugs = graph.nodes
      .filter((node) => node.type === 'article')
      .map((node) => node.slug)
      .filter((slug): slug is string => Boolean(slug));
    void import('@/lib/learning/db')
      .then(({ getLearningDatabase }) => getLearningDatabase().getAll('articleProgress'))
      .then((records) => {
        if (active) setLearningOverlay(buildLearningOverlay(articleSlugs, records));
      })
      .catch(() => {
        if (active) setLearningAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [graph]);

  const layout = useMemo(() => (graph ? layoutKnowledgeNodes(graph.nodes) : []), [graph]);
  const view = useMemo(
    () =>
      graph
        ? filterKnowledgeGraph(graph, { query, filter, selectedId, neighborhoodOnly })
        : undefined,
    [filter, graph, neighborhoodOnly, query, selectedId],
  );
  const layoutById = useMemo(() => new Map(layout.map((node) => [node.id, node])), [layout]);
  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const visiblePositionedNodes =
    view?.visibleNodes
      .map((node) => layoutById.get(node.id))
      .filter((node): node is PositionedKnowledgeNode => Boolean(node)) ?? [];
  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;
  const relatedNodes = useMemo(() => {
    if (!graph || !selectedId) return [];
    const ids = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return graph.nodes.filter((node) => ids.has(node.id));
  }, [graph, selectedId]);
  const learningSummary = useMemo(
    () => summarizeLearningOverlay(learningOverlay),
    [learningOverlay],
  );

  const reset = () => {
    setQuery('');
    setFilter('all');
    setSelectedId(undefined);
    setNeighborhoodOnly(false);
    setResetKey((value) => value + 1);
  };

  if (error) {
    return (
      <section className="knowledge-error" role="alert">
        <p className="eyebrow">PUBLIC GRAPH UNAVAILABLE</p>
        <h2>{error}</h2>
        <p>公开文章仍然可以正常阅读，稍后可重新访问此页面。</p>
        <a href="/blog">浏览全部文章 →</a>
      </section>
    );
  }

  if (!graph || !view) {
    return (
      <section className="knowledge-loading" role="status" aria-label="正在加载知识图谱">
        <span />
        <span />
        <span />
      </section>
    );
  }

  return (
    <div className="knowledge-experience">
      <KnowledgeGraphToolbar
        stats={graph.stats}
        query={query}
        filter={filter}
        selected={Boolean(selectedId)}
        neighborhoodOnly={neighborhoodOnly}
        visibleCount={view.visibleNodes.length}
        matchedCount={view.matchedNodeIds.length}
        learningSummary={learningSummary}
        learningAvailable={learningAvailable}
        onQueryChange={setQuery}
        onFilterChange={(value) => {
          setFilter(value);
          setNeighborhoodOnly(false);
        }}
        onNeighborhoodChange={() => setNeighborhoodOnly((value) => !value)}
        onReset={reset}
      />

      <div className="knowledge-workspace">
        <KnowledgeGraphCanvas
          key={resetKey}
          nodes={visiblePositionedNodes}
          edges={view.visibleEdges}
          selectedId={selectedId}
          matchedNodeIds={view.matchedNodeIds}
          relatedNodeIds={view.relatedNodeIds}
          queryActive={Boolean(query.trim())}
          learningOverlay={learningOverlay}
          onSelect={setSelectedId}
        />
        <KnowledgeGraphDetail
          node={selectedNode}
          relatedNodes={relatedNodes}
          learningState={selectedNode?.slug ? learningOverlay[selectedNode.slug] : undefined}
          learningAvailable={learningAvailable}
        />
      </div>

      <KnowledgeGraphList
        nodes={view.visibleNodes}
        selectedId={selectedId}
        learningOverlay={learningOverlay}
        onSelect={setSelectedId}
      />
    </div>
  );
}
