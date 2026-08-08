import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { remarkCodeMeta } from './src/plugins/remark-code-meta.mjs';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site =
  process.env.SITE_URL ??
  (productionHost
    ? `${productionHost.startsWith('http') ? '' : 'https://'}${productionHost}`
    : 'https://liufengwei-personal-blog.vercel.app');

export default defineConfig({
  site,
  output: 'static',
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.endsWith('/404.html') })],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-default',
      },
      wrap: true,
    },
    processor: unified({
      remarkPlugins: [remarkGfm, remarkMath, remarkCallouts, remarkCodeMeta, remarkMermaid],
      rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }], rehypeKatex],
    }),
  },
});
