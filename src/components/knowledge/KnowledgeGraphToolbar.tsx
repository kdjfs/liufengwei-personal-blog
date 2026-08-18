import type { KnowledgeGraph, KnowledgeNodeType } from '@/lib/knowledge/graph';
import type { KnowledgeFilter } from '@/lib/knowledge/view';

interface Props {
  stats: KnowledgeGraph['stats'];
  query: string;
  filter: KnowledgeFilter;
  selected: boolean;
  neighborhoodOnly: boolean;
  visibleCount: number;
  matchedCount: number;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: KnowledgeFilter) => void;
  onNeighborhoodChange: () => void;
  onReset: () => void;
}

const FILTERS: Array<{ value: KnowledgeFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'article', label: '文章' },
  { value: 'series', label: '系列' },
  { value: 'category', label: '分类' },
  { value: 'tag', label: '标签' },
];

const LEGEND: Array<{ type: KnowledgeNodeType; label: string }> = [
  { type: 'article', label: '文章' },
  { type: 'series', label: '系列' },
  { type: 'category', label: '分类' },
  { type: 'tag', label: '标签' },
];

export default function KnowledgeGraphToolbar({
  stats,
  query,
  filter,
  selected,
  neighborhoodOnly,
  visibleCount,
  matchedCount,
  onQueryChange,
  onFilterChange,
  onNeighborhoodChange,
  onReset,
}: Props) {
  return (
    <>
      <section className="knowledge-controls" aria-label="知识图谱搜索和筛选">
        <label>
          <span>搜索知识</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索文章、系列、分类或标签"
          />
        </label>
        <fieldset className="knowledge-filter-row">
          <legend className="sr-only">按节点类型筛选</legend>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
        <div className="knowledge-control-actions">
          <button
            type="button"
            aria-pressed={neighborhoodOnly}
            disabled={!selected}
            onClick={onNeighborhoodChange}
          >
            只看一度关系
          </button>
          <button type="button" onClick={onReset}>
            重置视图
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {query ? `找到 ${matchedCount} 个匹配节点` : `当前显示 ${visibleCount} 个节点`}
        </p>
      </section>

      <section className="knowledge-stats" aria-label="知识图谱统计">
        {[
          ['文章节点', stats.articleCount],
          ['知识主题', stats.categoryCount + stats.tagCount],
          ['系列', stats.seriesCount],
          ['关联关系', stats.edgeCount],
        ].map(([label, value]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <ul className="knowledge-legend" aria-label="节点图例">
        {LEGEND.map((item) => (
          <li key={item.type} data-type={item.type}>
            <i aria-hidden="true" /> {item.label}
          </li>
        ))}
      </ul>
    </>
  );
}
