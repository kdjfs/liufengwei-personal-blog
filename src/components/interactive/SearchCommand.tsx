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
  { label: '分类', note: '按知识主题浏览', href: '/categories' },
  { label: '标签', note: '寻找内容之间的连接', href: '/tags' },
  { label: '系列', note: '按顺序阅读专题内容', href: '/series' },
  { label: '归档', note: '沿时间查看全部写作', href: '/archive' },
  { label: '项目', note: '查看作品与实验', href: '/projects' },
  { label: '时间线', note: '沿时间回看成长', href: '/timeline' },
];

interface SearchCommandProps {
  initialOpen?: boolean;
}

export default function SearchCommand({ initialOpen = false }: SearchCommandProps) {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState('输入关键词，搜索文章、分类、标签与系列');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pagefindRef = useRef<PagefindApi | null>(null);

  const visibleLinks = useMemo(
    () =>
      quickLinks.filter(
        (item) => !query || `${item.label}${item.note}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const itemCount = results.length || visibleLinks.length + 1;

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-open-search]')) {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('dialog-open');
    setSelectedIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.documentElement.classList.remove('dialog-open');
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setMessage('输入关键词，搜索文章、分类、标签与系列');
        setSelectedIndex(0);
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
        if (cancelled) return;
        setResults(plainResults);
        setMessage(data.length ? `${data.length} 条匹配结果` : '没有找到匹配内容');
        setSelectedIndex(0);
      } catch {
        if (cancelled) return;
        setResults([]);
        setMessage('搜索索引将在 pnpm build 后可用');
        setSelectedIndex(0);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const close = () => setOpen(false);
  const switchTheme = () => {
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click();
    close();
  };
  const handleDialogKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setSelectedIndex((index) => (index + direction + itemCount) % itemCount);
      return;
    }
    if (event.key === 'Enter' && itemRefs.current[selectedIndex]) {
      event.preventDefault();
      itemRefs.current[selectedIndex]?.click();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  if (!open) return null;
  itemRefs.current = [];
  return (
    <div className="command-backdrop">
      <button className="command-dismiss" type="button" aria-label="关闭搜索" onClick={close} />
      <section
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="搜索与快捷操作"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="command-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章或输入页面名称…"
            aria-label="搜索"
            aria-controls="command-results"
            aria-activedescendant={`command-item-${selectedIndex}`}
            autoComplete="off"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results" id="command-results" role="listbox">
          <p className="command-status" aria-live="polite">
            {message}
          </p>
          {results.map((result, index) => (
            <a
              key={result.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              id={`command-item-${index}`}
              className={`command-item ${selectedIndex === index ? 'selected' : ''}`}
              href={result.url}
              role="option"
              aria-selected={selectedIndex === index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={close}
            >
              <span>
                <strong>{result.meta.title ?? '未命名页面'}</strong>
                <small>{result.excerpt}</small>
              </span>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
          {results.length === 0 &&
            visibleLinks.map((item, index) => (
              <a
                key={item.href}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                id={`command-item-${index}`}
                className={`command-item ${selectedIndex === index ? 'selected' : ''}`}
                href={item.href}
                role="option"
                aria-selected={selectedIndex === index}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={close}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <i aria-hidden="true">→</i>
              </a>
            ))}
          {results.length === 0 && (
            <button
              ref={(node) => {
                itemRefs.current[visibleLinks.length] = node;
              }}
              id={`command-item-${visibleLinks.length}`}
              className={`command-item ${selectedIndex === visibleLinks.length ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={selectedIndex === visibleLinks.length}
              onMouseEnter={() => setSelectedIndex(visibleLinks.length)}
              onClick={switchTheme}
            >
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
