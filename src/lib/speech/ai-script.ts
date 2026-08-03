export const AI_LISTENING_PROMPT_VERSION = 'v1';

export const AI_LISTENING_PROMPT = `请把当前技术文章整理成适合走路、通勤、睡前听的中文听读稿。

要求：
保留核心原理和面试重点；删除代码细节、Markdown 和表格；将代码结论改成自然语言；不要出现“如下代码”但随后没有代码；保留 MySQL、Redis、MVCC、EXPLAIN 等专有名词；结构自然、有过渡；不编造原文没有的项目事实；目标长度为原文的约 20%-35%；只输出纯听读文本。`;

export function fingerprintText(text: string): string {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildAudioScriptCacheKey(
  articleSlug: string,
  fingerprint: string,
  promptVersion: string,
): string {
  return `${articleSlug}:${fingerprint}:${promptVersion}`;
}

export function normalizeAIListeningScript(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const result: string[] = [];
  let skipCode = false;
  for (const line of lines) {
    const fence = line.trim().match(/^```\s*([\w-]*)/);
    if (fence) {
      if (skipCode) skipCode = false;
      else if (!['', 'text', 'markdown', 'md'].includes(fence[1]?.toLowerCase() ?? '')) {
        skipCode = true;
      }
      continue;
    }
    if (skipCode || /^\s*\|.*\|\s*$/.test(line) || /^\s*[-:| ]{5,}\s*$/.test(line)) continue;
    const spoken = line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/[*_~`]/g, '')
      .trim();
    if (spoken) result.push(spoken);
  }
  return result
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
