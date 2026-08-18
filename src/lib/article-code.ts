const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JAVASCRIPT',
  javascript: 'JAVASCRIPT',
  ts: 'TYPESCRIPT',
  typescript: 'TYPESCRIPT',
  shell: 'BASH',
  sh: 'BASH',
  plaintext: 'TEXT',
  txt: 'TEXT',
};

const CODE_ENHANCEMENT_ROOT_MARGIN = '800px 0px';

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>',
  expand:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"></path></svg>',
  collapse:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M20 15h-5v5"></path></svg>',
} as const;

type IconName = keyof typeof ICONS;

interface CodeEnhancerOptions {
  signal: AbortSignal;
  registerCleanup: (cleanup: () => void) => void;
}

interface CopyTextOptions {
  writeText?: (text: string) => Promise<void>;
  fallbackCopy?: (text: string) => boolean;
}

export function formatCodeLanguage(language?: string): string {
  const normalized = language?.trim().toLowerCase();
  if (!normalized) return 'TEXT';
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
}

function createIcon(name: IconName): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = ICONS[name];
  return template.content.firstElementChild as SVGSVGElement;
}

function setButtonIcon(button: HTMLButtonElement, name: IconName): void {
  button.replaceChildren(createIcon(name));
}

function makeAction(label: string, icon: IconName): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-frame__action';
  button.setAttribute('aria-label', label);
  button.dataset.tooltip = label;
  setButtonIcon(button, icon);
  return button;
}

function copyTextWithLegacyCommand(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.className = 'code-frame__clipboard-fallback';
  document.body.append(textarea);
  textarea.select();
  try {
    return (document as unknown as { execCommand: (command: 'copy') => boolean }).execCommand(
      'copy',
    );
  } finally {
    textarea.remove();
  }
}

export async function copyText(text: string, options?: CopyTextOptions): Promise<boolean> {
  const writeText =
    options?.writeText ??
    (typeof navigator !== 'undefined' && navigator.clipboard?.writeText
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : undefined);
  if (writeText) {
    try {
      await writeText(text);
      return true;
    } catch {
      // Clipboard permission can be denied even in supported browsers; keep the legacy fallback.
    }
  }

  try {
    return (options?.fallbackCopy ?? copyTextWithLegacyCommand)(text);
  } catch {
    return false;
  }
}

function readLanguage(pre: HTMLElement, code: HTMLElement | null): string {
  return (
    pre.dataset.language ??
    code?.dataset.language ??
    code?.className.match(/(?:^|\s)language-([\w+.-]+)/)?.[1] ??
    'text'
  );
}

export function enhanceCodeBlocks({ signal, registerCleanup }: CodeEnhancerOptions): void {
  const blocks = [...document.querySelectorAll<HTMLElement>('.prose pre')];
  if (blocks.length === 0) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'code-focus-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  let activeFrame: HTMLElement | undefined;
  let activeButton: HTMLButtonElement | undefined;
  let copyTimer = 0;

  const closeFocus = (restoreFocus = true) => {
    if (!activeFrame) return;
    activeFrame.classList.remove('is-fullscreen');
    activeButton?.setAttribute('aria-expanded', 'false');
    activeButton?.setAttribute('aria-label', '全屏查看代码');
    if (activeButton) {
      activeButton.dataset.tooltip = '全屏查看代码';
      setButtonIcon(activeButton, 'expand');
    }
    document.documentElement.classList.remove('code-focus-open');
    backdrop.hidden = true;
    const button = activeButton;
    activeFrame = undefined;
    activeButton = undefined;
    if (restoreFocus) button?.focus();
  };

  const openFocus = (frame: HTMLElement, button: HTMLButtonElement) => {
    closeFocus(false);
    activeFrame = frame;
    activeButton = button;
    frame.classList.add('is-fullscreen');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', '退出全屏代码');
    button.dataset.tooltip = '退出全屏';
    setButtonIcon(button, 'collapse');
    document.documentElement.classList.add('code-focus-open');
    backdrop.hidden = false;
    frame.focus({ preventScroll: true });
  };

  backdrop.addEventListener('click', () => closeFocus(), { signal });
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && activeFrame) {
        event.preventDefault();
        closeFocus();
      }
    },
    { signal },
  );

  const enhanceBlock = (pre: HTMLElement) => {
    if (pre.closest('.code-frame')) return;
    const code = pre.querySelector<HTMLElement>('code');
    const filename = pre.dataset.filename ?? code?.dataset.filename;

    const frame = document.createElement('section');
    frame.className = 'code-frame';
    frame.tabIndex = -1;
    frame.setAttribute('aria-label', `${formatCodeLanguage(readLanguage(pre, code))} 代码块`);

    const header = document.createElement('header');
    header.className = 'code-frame__header';
    const meta = document.createElement('div');
    meta.className = 'code-frame__meta';
    const lights = document.createElement('span');
    lights.className = 'code-frame__lights';
    lights.setAttribute('aria-hidden', 'true');
    for (const color of ['red', 'yellow', 'green']) {
      const light = document.createElement('span');
      light.className = color;
      lights.append(light);
    }
    const language = document.createElement('span');
    language.className = 'code-frame__language';
    language.textContent = formatCodeLanguage(readLanguage(pre, code));
    meta.append(lights, language);
    if (filename) {
      const separator = document.createElement('span');
      separator.className = 'code-frame__separator';
      separator.textContent = '·';
      separator.setAttribute('aria-hidden', 'true');
      const fileLabel = document.createElement('span');
      fileLabel.className = 'code-frame__filename';
      fileLabel.textContent = filename;
      meta.append(separator, fileLabel);
    }

    const actions = document.createElement('div');
    actions.className = 'code-frame__actions';
    const fullscreen = makeAction('全屏查看代码', 'expand');
    fullscreen.setAttribute('aria-expanded', 'false');
    fullscreen.addEventListener(
      'click',
      () => (activeFrame === frame ? closeFocus() : openFocus(frame, fullscreen)),
      { signal },
    );

    const copy = makeAction('复制代码', 'copy');
    const status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    copy.addEventListener(
      'click',
      async () => {
        window.clearTimeout(copyTimer);
        const copied = await copyText(code?.textContent ?? pre.textContent ?? '');
        const message = copied ? '已复制' : '复制失败';
        copy.setAttribute('aria-label', message);
        copy.dataset.tooltip = message;
        status.textContent = message;
        setButtonIcon(copy, copied ? 'check' : 'copy');
        copyTimer = window.setTimeout(() => {
          copy.setAttribute('aria-label', '复制代码');
          copy.dataset.tooltip = '复制代码';
          status.textContent = '';
          setButtonIcon(copy, 'copy');
        }, 1500);
      },
      { signal },
    );
    actions.append(fullscreen, copy, status);
    header.append(meta, actions);

    const body = document.createElement('div');
    body.className = 'code-frame__body';
    pre.before(frame);
    frame.append(header, body);
    body.append(pre);
  };

  const remainingBlocks = blocks.filter((pre) => !pre.closest('.code-frame'));
  const codeObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || signal.aborted) return;
        observer.unobserve(entry.target);
        enhanceBlock(entry.target as HTMLElement);
      });
    },
    { rootMargin: CODE_ENHANCEMENT_ROOT_MARGIN },
  );
  remainingBlocks.forEach((pre) => {
    codeObserver.observe(pre);
  });

  registerCleanup(() => {
    codeObserver.disconnect();
    window.clearTimeout(copyTimer);
    closeFocus(false);
    backdrop.remove();
  });
}
