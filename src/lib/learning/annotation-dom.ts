import { findTextQuoteOffset } from './annotations.ts';
import type { Annotation } from './types.ts';

export interface AnnotationDraftRequest {
  text: string;
  headingId?: string;
  headingText?: string;
  prefix: string;
  exact: string;
  suffix: string;
  articleSlug: string;
  rect: { left: number; top: number; right: number; bottom: number };
}

interface TextEntry {
  node: Text;
  start: number;
  end: number;
}

const EXCLUDED =
  'pre, code, a, .katex, [data-mermaid-source], .code-toolbar, mark[data-annotation-highlight]';

function collectText(scope: HTMLElement): { text: string; entries: TextEntry[] } {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const entries: TextEntry[] = [];
  let text = '';
  let node = walker.nextNode();
  while (node) {
    const current = node as Text;
    if (current.data && !current.parentElement?.closest(EXCLUDED)) {
      const start = text.length;
      text += current.data;
      entries.push({ node: current, start, end: text.length });
    }
    node = walker.nextNode();
  }
  return { text, entries };
}

function rangeAt(scope: HTMLElement, annotation: Annotation): Range | undefined {
  const { text, entries } = collectText(scope);
  const offset = findTextQuoteOffset(text, annotation);
  if (offset < 0) return undefined;
  const endOffset = offset + annotation.exact.length;
  const startEntry = entries.find((entry) => entry.start <= offset && entry.end >= offset);
  const endEntry = entries.find((entry) => entry.start <= endOffset && entry.end >= endOffset);
  if (!startEntry || !endEntry) return undefined;
  const range = document.createRange();
  range.setStart(startEntry.node, offset - startEntry.start);
  range.setEnd(endEntry.node, endOffset - endEntry.start);
  return range;
}

export function resolveAnnotationRange(
  prose: HTMLElement,
  annotation: Annotation,
): Range | undefined {
  const heading = annotation.headingId ? document.getElementById(annotation.headingId) : undefined;
  if (heading && prose.contains(heading)) {
    const section = heading.parentElement instanceof HTMLElement ? heading.parentElement : prose;
    const scoped = rangeAt(section, annotation);
    if (scoped) return scoped;
  }
  return rangeAt(prose, annotation);
}

function clearFallbackMarks(prose: HTMLElement): void {
  for (const mark of prose.querySelectorAll<HTMLElement>('mark[data-annotation-highlight]')) {
    mark.replaceWith(...mark.childNodes);
  }
  prose.normalize();
}

function addFallbackMark(range: Range, id: string): void {
  if (
    range.startContainer !== range.endContainer ||
    range.startContainer.nodeType !== Node.TEXT_NODE
  )
    return;
  const mark = document.createElement('mark');
  mark.dataset.annotationHighlight = id;
  mark.className = 'annotation-highlight';
  try {
    range.surroundContents(mark);
  } catch {
    // The annotation still remains available in the drawer when wrapping is unsafe.
  }
}

export function renderAnnotationHighlights(prose: HTMLElement, annotations: Annotation[]): void {
  clearFallbackMarks(prose);
  const ranges = annotations
    .map((annotation) => ({ annotation, range: resolveAnnotationRange(prose, annotation) }))
    .filter((item): item is { annotation: Annotation; range: Range } => Boolean(item.range));
  const css = globalThis.CSS as typeof CSS & { highlights?: Map<string, unknown> };
  const HighlightConstructor = (
    globalThis as typeof globalThis & { Highlight?: new (...ranges: Range[]) => unknown }
  ).Highlight;
  if (css?.highlights && HighlightConstructor) {
    css.highlights.set(
      'lfw-annotations',
      new HighlightConstructor(...ranges.map((item) => item.range)),
    );
    return;
  }
  for (const item of ranges.reverse()) addFallbackMark(item.range, item.annotation.id);
}

export function scrollToAnnotation(prose: HTMLElement, annotation: Annotation): boolean {
  const range = resolveAnnotationRange(prose, annotation);
  const target = range?.startContainer.parentElement;
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('annotation-focus-pulse');
  window.setTimeout(() => target.classList.remove('annotation-focus-pulse'), 1400);
  return true;
}
