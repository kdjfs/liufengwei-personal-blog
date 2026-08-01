const kinds = new Set(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']);

function extractText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(extractText).join('');
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    if (child.type === 'blockquote') {
      const first = child.children?.[0];
      const marker = extractText(first).match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (marker && kinds.has(marker[1].toUpperCase())) {
        child.data ??= {};
        child.data.hProperties = {
          className: ['callout', `callout-${marker[1].toLowerCase()}`],
          'data-callout': marker[1].toLowerCase(),
        };
        const textNode = first.children?.find((item) => typeof item.value === 'string');
        if (textNode) textNode.value = textNode.value.replace(marker[0], '');
      }
    }
    walk(child);
  }
}

/** 将 GitHub 风格的引用标记升级成语义化 Callout，普通 blockquote 保持不变。 */
export function remarkCallouts() {
  return (tree) => walk(tree);
}
