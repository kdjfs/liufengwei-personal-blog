import { createHash } from 'node:crypto';
import GithubSlugger from 'github-slugger';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeIndex,
  KnowledgeItem,
  KnowledgeTaxonomy,
} from './types.ts';

interface KnowledgePost {
  id: string;
  body?: string;
  data: {
    slug: string;
    title: string;
    description: string;
    category: string;
    tags: readonly string[];
    series?: string;
    publishDate?: Date;
    updatedDate?: Date;
    draft?: boolean;
  };
}
interface PublicProfile {
  name: string;
  role: string;
  school: string;
  major: string;
  graduation: number;
  bio: string;
  experiences: readonly { period: string; organization: string; role: string; summary: string }[];
  techFocus: Readonly<Record<string, readonly string[]>>;
  awards: readonly string[];
  socials?: readonly unknown[];
}
interface PublicProject {
  slug: string;
  name: string;
  description: string;
  techStack: readonly string[];
  background: readonly string[];
  myWork: readonly string[];
  highlights: readonly { title: string; description: string }[];
  challenges: readonly string[];
}
interface PublicTimelineItem {
  date: string;
  title: string;
  description: string;
  type: string;
}
interface KnowledgeSources {
  posts: readonly KnowledgePost[];
  profile: PublicProfile;
  projects: readonly PublicProject[];
  timeline: readonly PublicTimelineItem[];
}

const MIN_CHUNK_CHARS = 80;
const MAX_CHUNK_CHARS = 1100;
const MAX_CODE_CHARS = 500;
interface MarkdownNode {
  type: string;
  value?: string;
  lang?: string;
  depth?: number;
  children?: MarkdownNode[];
}

function truncateText(value: string, maxChars: number): string {
  const characters = Array.from(value.trim());
  return characters.length <= maxChars
    ? characters.join('')
    : `${characters
        .slice(0, Math.max(1, maxChars - 1))
        .join('')
        .trimEnd()}…`;
}
function removePrivateTraces(value: string): string {
  return value
    .replace(/\b[A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)\s*=\s*[^\s,，;；]+/g, '')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '')
    .replace(/\b[A-Z]:\\(?:[^\\\s]+\\)*[^\\\s，。；、]*/gi, '')
    .replace(/\/(?:Users|home)\/[^\s，。；、]+/gi, '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '')
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '')
    .replace(/(?:微信|WeChat)\s*[:：]?\s*[A-Za-z0-9_-]{5,}/gi, '');
}
export function stripMarkdownForKnowledge(markdown: string, maxChars = 1200): string {
  const prose = removePrivateTraces(markdown)
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/u, '')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/^ {4}.*$/gm, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/^\s*(?:import|export)\s+.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+/gm, '')
    .replace(/[>*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateText(prose, maxChars);
}

function dateValue(value?: Date): string | undefined {
  return value?.toISOString();
}
function nodeText(node: MarkdownNode): string {
  if (node.type === 'code') {
    const code = truncateText(String(node.value ?? ''), MAX_CODE_CHARS);
    return `${node.lang ? `${String(node.lang).toUpperCase()}: ` : ''}${code}${String(node.value ?? '').length > MAX_CODE_CHARS ? ' [code omitted]' : ''}`;
  }
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  const children = node.children.map(nodeText).filter(Boolean);
  if (node.type === 'listItem') return `- ${children.join(' ')}`;
  if (node.type === 'blockquote') return `> ${children.join(' ')}`;
  return children.join(' ');
}
function splitText(text: string): string[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const block of blocks) {
    if (current && Array.from(`${current}\n\n${block}`).length > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = block;
    } else current = current ? `${current}\n\n${block}` : block;
  }
  if (current) chunks.push(current);
  return chunks;
}
function buildArticleChunks(document: KnowledgeDocument, markdown: string): KnowledgeChunk[] {
  const root = unified().use(remarkParse).parse(removePrivateTraces(markdown)) as unknown as {
    children?: MarkdownNode[];
  };
  const slugger = new GithubSlugger();
  const sections: { heading?: string; anchor?: string; path: string[]; blocks: string[] }[] = [];
  let current = { path: [], blocks: [] } as {
    heading?: string;
    anchor?: string;
    path: string[];
    blocks: string[];
  };
  const headings: string[] = [];
  for (const node of root.children ?? []) {
    if (node.type === 'heading' && node.depth < 2) {
      headings[node.depth] = nodeText(node).trim();
      headings.length = node.depth + 1;
      continue;
    }
    if (node.type === 'heading' && node.depth >= 2) {
      if (current.blocks.length) sections.push(current);
      const heading = nodeText(node).trim();
      headings[node.depth] = heading;
      headings.length = node.depth + 1;
      current = {
        heading,
        anchor: slugger.slug(heading),
        path: headings.slice(2).filter(Boolean),
        blocks: [],
      };
      continue;
    }
    const text = nodeText(node).trim();
    if (text) current.blocks.push(text);
  }
  if (current.blocks.length) sections.push(current);
  const chunks: KnowledgeChunk[] = [];
  let pending: { text: string; section: (typeof sections)[number] } | undefined;
  for (const section of sections)
    for (let text of splitText(section.blocks.join('\n\n'))) {
      const source = pending?.section ?? section;
      if (pending) {
        text = `${pending.text}\n\n${text}`;
        pending = undefined;
      }
      if (Array.from(text).length < MIN_CHUNK_CHARS) {
        pending = { text, section: source };
        continue;
      }
      const anchor = source.anchor;
      chunks.push({
        id: `${document.id}#${anchor ?? 'intro'}:${chunks.length + 1}`,
        articleId: document.id,
        articleTitle: document.title,
        articleSlug: document.slug,
        url: anchor ? `${document.url}#${anchor}` : document.url,
        anchor,
        heading: source.heading,
        headingPath: source.path,
        category: document.category,
        tags: document.tags,
        order: chunks.length + 1,
        text,
      });
    }
  if (pending && chunks.length) {
    const previous = chunks.at(-1);
    if (previous) previous.text += `\n\n${pending.text}`;
  } else if (pending) {
    const { section, text } = pending;
    const anchor = section.anchor;
    chunks.push({
      id: `${document.id}#${anchor ?? 'intro'}:1`,
      articleId: document.id,
      articleTitle: document.title,
      articleSlug: document.slug,
      url: anchor ? `${document.url}#${anchor}` : document.url,
      anchor,
      heading: section.heading,
      headingPath: section.path,
      category: document.category,
      tags: document.tags,
      order: 1,
      text,
    });
  }
  return chunks;
}
function taxonomy(
  documents: KnowledgeDocument[],
  key: 'category' | 'tags' | 'series',
): KnowledgeTaxonomy[] {
  const map = new Map<string, string[]>();
  for (const document of documents.filter((item) => item.type === 'article'))
    for (const name of key === 'tags' ? document.tags : [document[key] ?? ''])
      if (name) map.set(name, [...(map.get(name) ?? []), document.id]);
  return [...map]
    .map(([name, articleIds]) => ({ name, articleIds, count: articleIds.length }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
export function createKnowledgeItems({
  posts,
  profile,
  projects,
  timeline,
}: KnowledgeSources): KnowledgeItem[] {
  const articles: KnowledgeDocument[] = posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      id: `article:${post.data.slug}`,
      type: 'article',
      title: post.data.title,
      slug: post.data.slug,
      url: `/blog/${post.data.slug}`,
      description: post.data.description,
      category: post.data.category,
      tags: [...post.data.tags],
      series: post.data.series,
      publishDate: dateValue(post.data.publishDate),
      updatedDate: dateValue(post.data.updatedDate),
      excerpt: stripMarkdownForKnowledge(post.body ?? '', 360),
    }));
  const focusTags = Object.values(profile.techFocus).flatMap((items) => [...items]);
  const profileItem: KnowledgeDocument = {
    id: 'profile:liufengwei',
    type: 'profile',
    title: `${profile.name} / Profile`,
    slug: 'about',
    url: '/about',
    description: profile.bio,
    category: 'Profile',
    tags: [profile.role, ...focusTags],
    excerpt: stripMarkdownForKnowledge(
      [
        profile.bio,
        `教育：${profile.school}${profile.major}专业，预计 ${profile.graduation} 年毕业。`,
        ...profile.experiences.map(
          (item) => `${item.period}，${item.organization}，${item.role}：${item.summary}`,
        ),
        `技术方向：${focusTags.join('、')}`,
        `公开奖项：${profile.awards.join('、')}`,
      ].join('\n'),
      1200,
    ),
  };
  const projectItems: KnowledgeDocument[] = projects.map((project) => ({
    id: `project:${project.slug}`,
    type: 'project',
    title: project.name,
    slug: project.slug,
    url: `/projects/${project.slug}`,
    description: project.description,
    category: 'Projects',
    tags: [...project.techStack],
    excerpt: stripMarkdownForKnowledge(
      [
        ...project.background,
        ...project.myWork,
        ...project.highlights.map((item) => `${item.title}：${item.description}`),
        ...project.challenges,
      ].join('\n'),
      800,
    ),
  }));
  const timelineItem: KnowledgeDocument = {
    id: 'timeline:public',
    type: 'timeline',
    title: '刘凤伟的公开时间线',
    slug: 'timeline',
    url: '/timeline',
    description: 'LFW Space 中公开记录的学习、项目与经历时间线。',
    category: 'Timeline',
    tags: [...new Set(timeline.map((item) => item.type))],
    excerpt: stripMarkdownForKnowledge(
      timeline.map((item) => `${item.date}｜${item.title}：${item.description}`).join('\n'),
      800,
    ),
  };
  return [...articles, profileItem, ...projectItems, timelineItem];
}
export function createKnowledgeIndex(sources: KnowledgeSources): KnowledgeIndex {
  const documents = createKnowledgeItems(sources);
  const articles = documents.filter((item) => item.type === 'article');
  const bodies = new Map(
    sources.posts
      .filter((post) => !post.data.draft)
      .map((post) => [`article:${post.data.slug}`, post.body ?? '']),
  );
  const chunks = articles.flatMap((document) =>
    buildArticleChunks(document, bodies.get(document.id) ?? ''),
  );
  const taxonomies = {
    categories: taxonomy(documents, 'category'),
    tags: taxonomy(documents, 'tags'),
    series: taxonomy(documents, 'series'),
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ documents, chunks: chunks.map(({ id, text }) => ({ id, text })) }))
    .digest('hex');
  return {
    version: 2,
    fingerprint,
    generatedAt: new Date().toISOString(),
    stats: {
      articles: articles.length,
      categories: taxonomies.categories.length,
      tags: taxonomies.tags.length,
      series: taxonomies.series.length,
      chunks: chunks.length,
    },
    taxonomies,
    documents,
    chunks,
  };
}
