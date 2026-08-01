import { useEffect, useMemo, useRef, useState } from 'react';

interface SearchResult {
  id: string;
  url: string;
  meta: { title?: string; image?: string };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<SearchResult>;
}

interface PagefindApi {
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
}

const quickLinks = [
  { label: '首页', note: '回到 LFW Space', href: '/' },
  { label: '全部文章', note: '浏览数字花园', href: '/blog' },
  { label: '项目', note: '查看作品与实验', href: '/projects' },
  { label: '时间线', note: '沿时间回看成长', href: '/timeline' },
];

export default function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState('输入关键词，搜索标题、摘要与正文');
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindRef = useRef<PagefindApi | null>(null);

  const visibleLinks = useMemo(
    () =>
      quickLinks.filter(
        (item) => !query || `${item.label}${item.note}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  useEffect(() => {
    const openSearch = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.querySelectorAll('[data-open-search]').forEach((button) => {
      button.addEventListener('click', openSearch);
    });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.querySelectorAll('[data-open-search]').forEach((button) => {
        button.removeEventListener('click', openSearch);
      });
    };
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setMessage('输入关键词，搜索标题、摘要与正文');
        return;
      }
      try {
        if (!pagefindRef.current) {
          // Pagefind 索引由生产构建生成，开发环境缺少索引时快捷导航仍可使用。
          const pagefindPath = '/pagefind/pagefind.js';
          const pagefind = (await import(/* @vite-ignore */ pagefindPath)) as PagefindApi;
          await pagefind.search('');
          pagefindRef.current = pagefind;
        }
        const search = await pagefindRef.current.search(query);
        const data = await Promise.all(search.results.slice(0, 7).map((result) => result.data()));
        const plainResults = data.map((result) => {
          const parsed = new DOMParser().parseFromString(result.excerpt, 'text/html');
          return { ...result, excerpt: parsed.body.textContent ?? '' };
        });
        setResults(plainResults);
        setMessage(data.length ? `${data.length} 条匹配结果` : '没有找到匹配内容');
      } catch {
        setResults([]);
        setMessage('搜索索引将在 pnpm build 后可用');
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const switchTheme = () =>
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click();

  if (!open) return null;
  return (
    <div className="command-backdrop">
      <button
        className="command-dismiss"
        type="button"
        aria-label="关闭搜索"
        onClick={() => setOpen(false)}
      />
      <section
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="搜索与快捷操作"
      >
        <div className="command-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章或输入页面名称…"
            aria-label="搜索"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results">
          <p className="command-status">{message}</p>
          {results.map((result) => (
            <a key={result.id} className="command-item" href={result.url}>
              <span>
                <strong>{result.meta.title ?? '未命名页面'}</strong>
                <small>{result.excerpt}</small>
              </span>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
          {results.length === 0 &&
            visibleLinks.map((item) => (
              <a key={item.href} className="command-item" href={item.href}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <i aria-hidden="true">→</i>
              </a>
            ))}
          {results.length === 0 && (
            <button className="command-item" type="button" onClick={switchTheme}>
              <span>
                <strong>切换主题</strong>
                <small>Light / Dark / System</small>
              </span>
              <i aria-hidden="true">◐</i>
            </button>
          )}
        </div>
        <footer className="command-footer">
          <span>↑↓ 浏览</span>
          <span>↵ 打开</span>
          <span>ESC 关闭</span>
        </footer>
      </section>
    </div>
  );
}
