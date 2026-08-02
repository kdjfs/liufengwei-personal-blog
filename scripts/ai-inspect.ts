import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { retrieveKnowledge } from '../src/lib/ai/retrieval.ts';
import type { KnowledgeIndex } from '../src/lib/ai/types.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.indexOf(name);
const json = JSON.parse(
  await readFile(resolve('dist/ai-knowledge.json'), 'utf8'),
) as KnowledgeIndex;

if (flag('--stats') >= 0) {
  console.log(
    `Knowledge V${json.version}\nFingerprint: ${json.fingerprint}\nArticles: ${json.stats.articles}\nCategories: ${json.stats.categories}\nChunks: ${json.stats.chunks}`,
  );
} else if (flag('--category') >= 0) {
  const name = args[flag('--category') + 1];
  const category = json.taxonomies.categories.find((item) => item.name === name);
  console.log(`${name ?? '未知分类'}: ${category?.count ?? 0} 篇`);
  for (const id of category?.articleIds ?? [])
    console.log(`- ${json.documents.find((item) => item.id === id)?.title}`);
} else if (flag('--query') >= 0) {
  const query = args[flag('--query') + 1] ?? '';
  const result = retrieveKnowledge(query, json, '/');
  console.log(
    JSON.stringify(
      {
        intent: result.intent,
        confidence: result.confidence,
        facts: result.facts,
        chunks: result.chunks.map((chunk) => ({
          title: chunk.articleTitle,
          heading: chunk.heading,
          url: chunk.url,
        })),
      },
      null,
      2,
    ),
  );
} else {
  console.error('Usage: pnpm ai:inspect -- --stats | --category <name> | --query <question>');
  process.exitCode = 1;
}
