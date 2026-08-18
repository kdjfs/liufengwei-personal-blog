import type { KnowledgeNode, KnowledgeNodeType } from '@/lib/knowledge/graph';
import type { KnowledgeLearningOverlay } from '@/lib/knowledge/learning-overlay';

interface Props {
  nodes: KnowledgeNode[];
  selectedId?: string;
  learningOverlay: KnowledgeLearningOverlay;
  onSelect: (nodeId: string) => void;
}

const GROUPS: Array<{ type: KnowledgeNodeType; label: string }> = [
  { type: 'article', label: '文章' },
  { type: 'series', label: '系列' },
  { type: 'category', label: '分类' },
  { type: 'tag', label: '标签' },
];

export default function KnowledgeGraphList({
  nodes,
  selectedId,
  learningOverlay,
  onSelect,
}: Props) {
  return (
    <section className="knowledge-list" aria-labelledby="knowledge-list-title">
      <div className="knowledge-section-head">
        <div>
          <p className="eyebrow">ACCESSIBLE EXPLORE VIEW</p>
          <h2 id="knowledge-list-title">按列表探索知识</h2>
        </div>
        <p>图谱的等价键盘导航入口，共 {nodes.length} 个当前可见节点。</p>
      </div>
      <div className="knowledge-list-groups">
        {GROUPS.map((group) => {
          const groupNodes = nodes.filter((node) => node.type === group.type);
          if (groupNodes.length === 0) return null;
          return (
            <details key={group.type} open={group.type !== 'tag'}>
              <summary>
                <span>{group.label}</span>
                <strong>{groupNodes.length}</strong>
              </summary>
              <ul>
                {groupNodes.map((node) => (
                  <li key={node.id} data-selected={node.id === selectedId || undefined}>
                    <button type="button" onClick={() => onSelect(node.id)}>
                      <span>{node.label}</span>
                      {node.type === 'article' && (
                        <small>
                          {node.category}
                          {node.slug && learningOverlay[node.slug]?.status === 'completed'
                            ? ' · 已完成'
                            : node.slug && learningOverlay[node.slug]?.status === 'reading'
                              ? ' · 学习中'
                              : ''}
                        </small>
                      )}
                    </button>
                    <a href={node.href} aria-label={`打开${node.label}`}>
                      →
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
