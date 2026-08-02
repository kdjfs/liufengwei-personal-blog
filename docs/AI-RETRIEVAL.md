# AI Retrieval 2.0

`ai-knowledge.json` is built from published Content Collections. V2 separates article metadata from Markdown heading chunks, so category/tag/series counts and complete lists are deterministic while technical questions retrieve the most relevant section.

Lexical search uses `Intl.Segmenter` where available, Chinese bigram fallback, English normalization, and a compact synonym map. The index fingerprint changes with public content, while the response and browser fetch both require revalidation after deployment.

Run `pnpm ai:inspect -- --stats`, `--category 后端`, or `--query "缓存雪崩"` after a production build. Future hybrid retrieval can replace the lexical scoring layer without changing the metadata contract.
