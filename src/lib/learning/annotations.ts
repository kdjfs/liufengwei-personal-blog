export interface TextQuoteAnchor {
  exact: string;
  prefix: string;
  suffix: string;
}

export function buildTextQuoteAnchor(
  scopeText: string,
  start: number,
  end: number,
  contextLength = 64,
): TextQuoteAnchor {
  const safeStart = Math.max(0, Math.min(start, scopeText.length));
  const safeEnd = Math.max(safeStart, Math.min(end, scopeText.length));
  return {
    exact: scopeText.slice(safeStart, safeEnd),
    prefix: scopeText.slice(Math.max(0, safeStart - contextLength), safeStart),
    suffix: scopeText.slice(safeEnd, safeEnd + contextLength),
  };
}

function contextScore(text: string, index: number, anchor: TextQuoteAnchor): number {
  const prefix = text.slice(Math.max(0, index - anchor.prefix.length), index);
  const suffix = text.slice(
    index + anchor.exact.length,
    index + anchor.exact.length + anchor.suffix.length,
  );
  let score = 0;
  if (anchor.prefix && prefix.endsWith(anchor.prefix)) score += 2;
  if (anchor.suffix && suffix.startsWith(anchor.suffix)) score += 2;
  return score;
}

export function findTextQuoteOffset(text: string, anchor: TextQuoteAnchor): number {
  if (!anchor.exact) return -1;
  let bestIndex = -1;
  let bestScore = -1;
  let index = text.indexOf(anchor.exact);
  while (index >= 0) {
    const score = contextScore(text, index, anchor);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
    index = text.indexOf(anchor.exact, index + Math.max(1, anchor.exact.length));
  }
  return bestIndex;
}
