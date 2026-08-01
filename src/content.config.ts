import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

/**
 * 内容字段是博客的长期契约：构建阶段即拒绝缺字段、错误日期和非法枚举，
 * 避免把内容问题拖到浏览器运行时才暴露。
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 必须是 lowercase URL-safe 格式'),
    title: z.string().min(2).max(100),
    description: z.string().min(10).max(220),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().min(1).max(40),
    tags: z.array(z.string().min(1).max(30)).min(1).max(8),
    series: z.string().min(1).max(60).optional(),
    seriesOrder: z.number().int().positive().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    toc: z.boolean().default(true),
    canonical: z.url().optional(),
  }),
});

export const collections = { blog };
