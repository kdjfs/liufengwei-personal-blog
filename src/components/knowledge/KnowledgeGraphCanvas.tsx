import { useMemo, useRef, useState } from 'react';
import type { KnowledgeEdge } from '@/lib/knowledge/graph';
import type { PositionedKnowledgeNode } from '@/lib/knowledge/view';

interface Props {
  nodes: PositionedKnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedId?: string;
  matchedNodeIds: string[];
  relatedNodeIds: string[];
  queryActive: boolean;
  onSelect: (nodeId: string) => void;
}

const nodeRadius = (type: PositionedKnowledgeNode['type']) =>
  ({ article: 6, category: 14, tag: 9, series: 12 })[type];

const shortLabel = (label: string) => (label.length > 14 ? `${label.slice(0, 13)}…` : label);

export default function KnowledgeGraphCanvas({
  nodes,
  edges,
  selectedId,
  matchedNodeIds,
  relatedNodeIds,
  queryActive,
  onSelect,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | undefined>(undefined);
  const [hoveredId, setHoveredId] = useState<string>();
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const positions = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const matched = useMemo(() => new Set(matchedNodeIds), [matchedNodeIds]);
  const related = useMemo(() => new Set(relatedNodeIds), [relatedNodeIds]);
  const activeId = hoveredId ?? selectedId;

  const zoom = (delta: number) => {
    setViewport((current) => ({
      ...current,
      scale: Math.min(2.4, Math.max(0.62, current.scale + delta)),
    }));
  };

  return (
    <div className="knowledge-canvas-frame">
      <fieldset className="knowledge-canvas-actions">
        <legend className="sr-only">图谱视图控制</legend>
        <button type="button" onClick={() => zoom(0.16)} aria-label="放大知识图谱">
          +
        </button>
        <button type="button" onClick={() => zoom(-0.16)} aria-label="缩小知识图谱">
          −
        </button>
      </fieldset>
      <svg
        ref={svgRef}
        className="knowledge-canvas"
        viewBox="0 0 1200 760"
        aria-hidden="true"
        focusable="false"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.1 : -0.1);
        }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg || drag.pointerId !== event.pointerId) return;
          const ratio = 1200 / svg.clientWidth;
          const deltaX = (event.clientX - drag.x) * ratio;
          const deltaY = (event.clientY - drag.y) * ratio;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          setViewport((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          dragRef.current = undefined;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <g
          transform={`translate(${viewport.x} ${viewport.y}) translate(600 380) scale(${viewport.scale}) translate(-600 -380)`}
        >
          <g className="knowledge-edges">
            {edges.map((edge) => {
              const source = positions.get(edge.source);
              const target = positions.get(edge.target);
              if (!source || !target) return null;
              const highlighted = Boolean(
                activeId && (edge.source === activeId || edge.target === activeId),
              );
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  data-highlighted={highlighted || undefined}
                />
              );
            })}
          </g>
          <g className="knowledge-nodes">
            {nodes.map((node) => {
              const selected = node.id === selectedId;
              const highlighted = selected || related.has(node.id) || matched.has(node.id);
              const dimmed = queryActive
                ? !matched.has(node.id)
                : Boolean(activeId && node.id !== activeId && !related.has(node.id));
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: the SVG is an aria-hidden pointer enhancement; the list below is the keyboard equivalent.
                <g
                  key={node.id}
                  className="knowledge-node"
                  data-type={node.type}
                  data-selected={selected || undefined}
                  data-highlighted={highlighted || undefined}
                  data-dimmed={dimmed || undefined}
                  transform={`translate(${node.x} ${node.y})`}
                  onClick={() => onSelect(node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(undefined)}
                >
                  <circle r={nodeRadius(node.type)} />
                  <text y={nodeRadius(node.type) + 16}>{shortLabel(node.label)}</text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <p className="knowledge-canvas-hint">拖动画布 · 滚轮缩放 · 点击节点查看详情</p>
    </div>
  );
}
