export type SpeechBlockKind = 'heading' | 'paragraph' | 'code' | 'table' | 'formula' | 'mermaid';

export interface SpeechBlock {
  kind: SpeechBlockKind;
  text: string;
  heading?: string;
  language?: string;
}

export interface SpeechSegment {
  text: string;
  heading?: string;
}

const MIN_SEGMENT = 150;
const MAX_SEGMENT = 350;

function cleanText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLongPart(part: string): string[] {
  if (part.length <= MAX_SEGMENT) return [part];
  const chunks: string[] = [];
  let rest = part;
  while (rest.length > MAX_SEGMENT) {
    const window = rest.slice(0, MAX_SEGMENT + 1);
    const preferred = Math.max(
      window.lastIndexOf('；'),
      window.lastIndexOf('，'),
      window.lastIndexOf(' '),
    );
    const cut = preferred >= MIN_SEGMENT ? preferred + 1 : MAX_SEGMENT;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export function segmentSpeechText(rawText: string): string[] {
  const text = cleanText(rawText);
  if (!text) return [];
  const sentences = text
    .split(/(?<=[。！？!?；;])|\n+/u)
    .flatMap((part) => splitLongPart(part.trim()))
    .filter(Boolean);
  const segments: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_SEGMENT) {
      segments.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
    if (current.length >= MIN_SEGMENT) {
      segments.push(current);
      current = '';
    }
  }
  if (current) {
    const previous = segments.at(-1);
    if (previous && previous.length + current.length <= MAX_SEGMENT) {
      segments[segments.length - 1] = previous + current;
    } else {
      segments.push(current);
    }
  }
  return segments;
}

function announcement(block: SpeechBlock): string {
  if (block.kind === 'code') {
    const language = (block.language || '代码').replace(/^language-/, '').toUpperCase();
    return `这里有一段 ${language} 示例代码，已跳过。`;
  }
  if (block.kind === 'table') return '这里有一张数据表，已跳过。';
  if (block.kind === 'formula') return '这里有一段数学公式，已跳过。';
  if (block.kind === 'mermaid') return '这里有一张流程图，已跳过。';
  return block.text;
}

export function normalizeSpeechBlocks(blocks: SpeechBlock[]): SpeechSegment[] {
  const result: SpeechSegment[] = [];
  let activeHeading: string | undefined;
  for (const block of blocks) {
    if (block.kind === 'heading') activeHeading = cleanText(block.text) || block.heading;
    const text = announcement(block);
    for (const segment of segmentSpeechText(text)) {
      result.push({ text: segment, heading: block.heading || activeHeading });
    }
  }
  return result;
}
