import type { KnowledgeNode } from '@/lib/knowledge/graph';

interface Props {
  node?: KnowledgeNode;
  relatedNodes: KnowledgeNode[];
}

const TYPE_LABELS: Record<KnowledgeNode['type'], string> = {
  article: '文章',
  category: '分类',
  tag: '标签',
  series: '系列',
};

export default function KnowledgeGraphDetail({ node, relatedNodes }: Props) {
  if (!node) {
    return (
      <aside className="knowledge-detail" aria-live="polite">
        <span className="knowledge-detail-handle" aria-hidden="true" />
        <p className="eyebrow">SELECTED NODE</p>
        <h2>选择一个知识节点</h2>
        <p>查看它与文章、分类、标签和系列之间的直接关系。</p>
      </aside>
    );
  }

  return (
    <aside className="knowledge-detail" aria-live="polite">
      <span className="knowledge-detail-handle" aria-hidden="true" />
      <p className="eyebrow">{TYPE_LABELS[node.type]} NODE</p>
      <h2>{node.label}</h2>
      {node.description && <p>{node.description}</p>}
      <dl>
        <div>
          <dt>类型</dt>
          <dd>{TYPE_LABELS[node.type]}</dd>
        </div>
        <div>
          <dt>直接关联</dt>
          <dd>{relatedNodes.length}</dd>
        </div>
        {node.category && (
          <div>
            <dt>分类</dt>
            <dd>{node.category}</dd>
          </div>
        )}
        {node.series && (
          <div>
            <dt>系列</dt>
            <dd>
              {node.series} · {node.seriesOrder}
            </dd>
          </div>
        )}
      </dl>
      {node.tags && (
        <ul className="knowledge-detail-tags" aria-label="文章标签">
          {node.tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}
      {relatedNodes.length > 0 && (
        <div className="knowledge-related">
          <h3>直接关联</h3>
          <ul>
            {relatedNodes.slice(0, 8).map((related) => (
              <li key={related.id}>
                <a href={related.href}>{related.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <a className="knowledge-detail-link" href={node.href}>
        {node.type === 'article' ? '阅读文章' : `查看${TYPE_LABELS[node.type]}`} →
      </a>
    </aside>
  );
}
