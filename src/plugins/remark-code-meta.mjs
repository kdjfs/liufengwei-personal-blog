function findFilename(meta) {
  if (!meta) return undefined;
  const named = meta.match(/(?:title|filename)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
  if (named) return named[1] ?? named[2] ?? named[3];
  return meta.match(/(?:^|\s)([\w@./-]+\.[a-z0-9]+)(?:\s|$)/i)?.[1];
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    if (child.type === 'code') {
      const filename = findFilename(child.meta);
      if (filename) {
        child.data ??= {};
        child.data.hProperties = {
          ...(child.data.hProperties ?? {}),
          'data-filename': filename,
        };
      }
    }
    walk(child);
  }
}

/** 支持 ```ts title="app.ts" 与 ```ts app.ts 两种轻量文件名语法。 */
export function remarkCodeMeta() {
  return (tree) => walk(tree);
}
