import { enhanceCodeBlocks } from '@/lib/article-code';

let cleanupArticleEnhancements: (() => void) | undefined;

const enhanceArticlePage = async () => {
  cleanupArticleEnhancements?.();
  if (!document.querySelector('[data-article]')) return;

  const controller = new AbortController();
  const { signal } = controller;
  const observers: IntersectionObserver[] = [];
  const cleanupCallbacks: Array<() => void> = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const article = document.querySelector<HTMLElement>('[data-article]');
  const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    if (!article || !progress) return;
    const top = article.offsetTop;
    const distance = Math.max(1, article.offsetHeight - window.innerHeight);
    const value = Math.min(1, Math.max(0, (window.scrollY - top) / distance));
    progress.style.transform = `scaleX(${value})`;
  };
  const requestProgressUpdate = () => {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', requestProgressUpdate, { passive: true, signal });
  window.addEventListener('resize', requestProgressUpdate, { passive: true, signal });
  updateProgress();

  const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const mobileTocLinks = [
    ...document.querySelectorAll<HTMLAnchorElement>('[data-mobile-toc-link]'),
  ];
  const currentHeading = document.querySelector<HTMLElement>('[data-current-heading]');
  const headings = tocLinks
    .map((link) => document.getElementById(link.dataset.tocLink ?? ''))
    .filter((heading): heading is HTMLElement => Boolean(heading));

  const setActiveHeading = (id: string) => {
    const activeHeading = headings.find((heading) => heading.id === id);
    tocLinks.forEach((link) => {
      const active = link.dataset.tocLink === id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    mobileTocLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.mobileTocLink === id);
    });
    if (currentHeading && activeHeading) currentHeading.textContent = activeHeading.textContent;
  };

  if (headings.length > 0) {
    setActiveHeading(headings[0].id);
    const headingObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 1] },
    );
    headings.forEach((heading) => {
      headingObserver.observe(heading);
    });
    observers.push(headingObserver);
  }

  [...tocLinks, ...mobileTocLinks].forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const id = link.hash.slice(1);
        const target = document.getElementById(decodeURIComponent(id));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        history.replaceState(null, '', link.hash);
      },
      { signal },
    );
  });

  const mobileToc = document.querySelector<HTMLDialogElement>('[data-mobile-toc]');
  const openToc = document.querySelector<HTMLButtonElement>('[data-toc-open]');
  const closeToc = document.querySelector<HTMLButtonElement>('[data-toc-close]');
  const setDialogScrollLock = (locked: boolean) => {
    document.documentElement.classList.toggle('dialog-open', locked);
  };
  openToc?.addEventListener(
    'click',
    () => {
      mobileToc?.showModal();
      setDialogScrollLock(true);
    },
    { signal },
  );
  closeToc?.addEventListener('click', () => mobileToc?.close(), { signal });
  mobileToc?.addEventListener(
    'click',
    (event) => {
      if (event.target === mobileToc) mobileToc.close();
    },
    { signal },
  );
  mobileToc?.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        mobileToc.close();
      }
    },
    { signal },
  );
  mobileToc?.addEventListener('close', () => setDialogScrollLock(false), { signal });
  mobileTocLinks.forEach((link) => {
    link.addEventListener('click', () => mobileToc?.close(), { signal });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-reading-action]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const action = button.dataset.readingAction;
        if (action === 'toc') tocLinks[0]?.focus();
        if (action === 'annotations') window.dispatchEvent(new Event('lfw:annotations:open'));
        if (action === 'listening') window.dispatchEvent(new Event('lfw:speech:open'));
      },
      { signal },
    );
  });

  // Shiki keeps build-time token rendering; this enhancer only adds stable reader controls.
  enhanceCodeBlocks({
    signal,
    registerCleanup: (cleanup) => cleanupCallbacks.push(cleanup),
  });

  const lightboxImages = [...document.querySelectorAll<HTMLImageElement>('.prose img:not(a img)')];
  if (lightboxImages.length > 0) {
    lightboxImages.forEach((image) => {
      if (!image.title || image.parentElement?.classList.contains('article-image')) return;
      const figure = document.createElement('figure');
      figure.className = 'article-image';
      const caption = document.createElement('figcaption');
      caption.textContent = image.title;
      image.before(figure);
      figure.append(image, caption);
    });
    const lightbox = document.createElement('dialog');
    lightbox.className = 'article-lightbox';
    lightbox.setAttribute('aria-label', '图片预览');
    lightbox.innerHTML =
      '<button type="button" aria-label="关闭图片预览">关闭</button><figure><img alt="" /><figcaption></figcaption></figure>';
    document.body.append(lightbox);
    const preview = lightbox.querySelector<HTMLImageElement>('img');
    const caption = lightbox.querySelector<HTMLElement>('figcaption');
    const close = lightbox.querySelector<HTMLButtonElement>('button');
    const openLightbox = (source: HTMLImageElement) => {
      if (!preview || !caption) return;
      preview.src = source.currentSrc || source.src;
      preview.alt = source.alt;
      caption.textContent = source.title || source.alt;
      caption.hidden = !caption.textContent;
      lightbox.showModal();
      setDialogScrollLock(true);
    };
    lightboxImages.forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `查看大图：${image.alt || '文章图片'}`);
      image.addEventListener('click', () => openLightbox(image), { signal });
      image.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox(image);
          }
        },
        { signal },
      );
    });
    close?.addEventListener('click', () => lightbox.close(), { signal });
    lightbox.addEventListener(
      'click',
      (event) => {
        if (event.target === lightbox) lightbox.close();
      },
      { signal },
    );
    lightbox.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          lightbox.close();
        }
      },
      { signal },
    );
    lightbox.addEventListener('close', () => setDialogScrollLock(false), { signal });
    cleanupCallbacks.push(() => lightbox.remove());
  }

  // 只有文章真实包含 Mermaid 时才下载解析器；普通页面不会承担这部分成本。
  const diagrams = [...document.querySelectorAll<HTMLElement>('[data-mermaid-source]')];
  if (diagrams.length > 0) {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'neutral',
      securityLevel: 'strict',
      fontFamily: 'Inter, ui-sans-serif, system-ui',
    });
    await mermaid.run({ nodes: diagrams });
  }

  // Selection toolbar with copy & read-aloud
  import('@/lib/selection-speech.ts').then(({ initSelectionSpeech }) => {
    initSelectionSpeech(signal);
  });

  cleanupArticleEnhancements = () => {
    controller.abort();
    observers.forEach((observer) => {
      observer.disconnect();
    });
    cleanupCallbacks.forEach((cleanup) => {
      cleanup();
    });
    if (progressFrame) window.cancelAnimationFrame(progressFrame);
    setDialogScrollLock(false);
  };
};

document.addEventListener('astro:page-load', enhanceArticlePage);
