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
