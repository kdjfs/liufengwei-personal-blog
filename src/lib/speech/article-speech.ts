import { normalizeSpeechBlocks, type SpeechBlock, type SpeechSegment } from './text-normalizer.ts';

const BLOCK_SELECTOR = 'h2, h3, h4, h5, h6, p, li, blockquote, pre, table, [data-mermaid-source]';
const HEADING_SELECTOR = 'h2, h3, h4, h5, h6';

function plainText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const node of clone.querySelectorAll(
    '.katex, [data-mermaid-source], button, nav, img, .code-frame__header, [aria-hidden="true"]',
  )) {
    node.remove();
  }
  return clone.textContent?.trim() ?? '';
}

function codeLanguage(element: HTMLElement): string | undefined {
  const code = element.querySelector('code');
  return [...(code?.classList ?? [])].find((name) => name.startsWith('language-'))?.slice(9);
}

export function extractArticleSpeech(prose: HTMLElement): SpeechSegment[] {
  let heading: string | undefined;
  const blocks: SpeechBlock[] = [];
  for (const element of prose.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (element.parentElement?.closest('pre, table, blockquote, li')) continue;
    if (element.matches(HEADING_SELECTOR)) {
      heading = plainText(element);
      blocks.push({ kind: 'heading', text: heading, heading });
    } else if (element.matches('pre')) {
      blocks.push({ kind: 'code', text: '', heading, language: codeLanguage(element) });
    } else if (element.matches('table')) {
      blocks.push({ kind: 'table', text: '', heading });
    } else if (element.matches('[data-mermaid-source]')) {
      blocks.push({ kind: 'mermaid', text: '', heading });
    } else {
      const text = plainText(element);
      if (text) blocks.push({ kind: 'paragraph', text, heading });
    }
  }
  return normalizeSpeechBlocks(blocks);
}
