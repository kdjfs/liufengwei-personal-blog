const CHINESE_DIGITS = new Map([
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
]);

function parseChineseNumber(value) {
  if (value === '十') return 10;
  if (!value.includes('十')) return CHINESE_DIGITS.get(value);
  const [tens, ones] = value.split('十');
  const tensValue = tens ? CHINESE_DIGITS.get(tens) : 1;
  const onesValue = ones ? CHINESE_DIGITS.get(ones) : 0;
  if (!tensValue || onesValue === undefined) return undefined;
  return tensValue * 10 + onesValue;
}

/** Parse an explicit leading chapter/article/section marker without guessing a series. */
export function parseChapterOrder(title) {
  const normalized = String(title ?? '')
    .normalize('NFKC')
    .trim();
  const match = normalized.match(/^第\s*([一二三四五六七八九十]{1,3}|\d{1,2})\s*[章篇节]/u);
  if (
    !match ||
    /第\s*(?:[一二三四五六七八九十]{1,3}|\d{1,2})\s*[章篇节]/u.test(
      normalized.slice(match[0].length),
    )
  ) {
    return undefined;
  }
  const order = /^\d+$/u.test(match[1]) ? Number(match[1]) : parseChineseNumber(match[1]);
  return Number.isInteger(order) && order > 0 && order <= 99 ? order : undefined;
}
