function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    if (child.type === 'code' && child.lang === 'mermaid') {
      return {
        type: 'html',
        value: `<div class="mermaid" data-mermaid-source>${escapeHtml(child.value)}</div>`,
      };
    }
    walk(child);
    return child;
  });
}

/** Mermaid 只把专用代码块变为占位节点，真正库在文章包含图表时才动态加载。 */
export function remarkMermaid() {
  return (tree) => walk(tree);
}
