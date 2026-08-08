import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const pages = {
  home: { file: 'dist/index.html', budget: 35 * 1024 },
  article: { file: 'dist/blog/3-yue-20-san-wei-jia/index.html', budget: 45 * 1024 },
  learning: { file: 'dist/learning/index.html', budget: 35 * 1024 },
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function assetSize(reference) {
  const content = await readFile(path.join('dist', reference));
  return { raw: content.byteLength, gzip: gzipSync(content).byteLength };
}

let failed = false;
console.log('LFW Space initial bundle report (raw / gzip)');

for (const [name, page] of Object.entries(pages)) {
  const html = await readFile(page.file, 'utf8');
  const references = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]),
    ),
  ];
  const totals = {
    js: { raw: 0, gzip: 0 },
    css: { raw: 0, gzip: 0 },
  };
  for (const reference of references) {
    const kind = reference.endsWith('.js') ? 'js' : 'css';
    const size = await assetSize(reference);
    totals[kind].raw += size.raw;
    totals[kind].gzip += size.gzip;
  }
  const initialGzip = totals.js.gzip + totals.css.gzip;
  const status = initialGzip <= page.budget ? 'PASS' : 'FAIL';
  if (status === 'FAIL') failed = true;
  console.log(
    `${name.padEnd(8)} JS ${formatBytes(totals.js.raw)} / ${formatBytes(totals.js.gzip)} · CSS ${formatBytes(totals.css.raw)} / ${formatBytes(totals.css.gzip)} · total gzip ${formatBytes(initialGzip)} / ${formatBytes(page.budget)} ${status}`,
  );
}

const assets = (await readdir('dist/_astro'))
  .filter((name) => name.endsWith('.js'))
  .map(async (name) => ({ name, ...(await assetSize(`/_astro/${name}`)) }));
const largest = (await Promise.all(assets)).sort((left, right) => right.raw - left.raw).slice(0, 5);
console.log('\nLargest generated JS chunks (mostly deferred Mermaid/AI routes):');
largest.forEach((asset) => {
  console.log(`- ${asset.name}: ${formatBytes(asset.raw)} / ${formatBytes(asset.gzip)}`);
});

if (failed) {
  console.error('\nBundle budget exceeded.');
  process.exitCode = 1;
}
