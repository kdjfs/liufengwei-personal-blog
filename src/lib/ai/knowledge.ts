import type { KnowledgeItem } from './types.ts';

interface KnowledgePost {
  id: string;
  body?: string;
  data: {
    slug: string;
    title: string;
    description: string;
    category: string;
    tags: readonly string[];
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
  experiences: readonly {
    period: string;
    organization: string;
    role: string;
    summary: string;
  }[];
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

function truncateText(value: string, maxChars: number): string {
  const characters = Array.from(value.trim());
  if (characters.length <= maxChars) return characters.join('');
  return `${characters
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

export function createKnowledgeItems({
  posts,
  profile,
  projects,
  timeline,
}: KnowledgeSources): KnowledgeItem[] {
  const articles: KnowledgeItem[] = posts
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
      excerpt: stripMarkdownForKnowledge(post.body ?? '', 1200),
    }));

  const focusTags = Object.values(profile.techFocus).flatMap((items) => [...items]);
  const profileExcerpt = stripMarkdownForKnowledge(
    [
      profile.bio,
      `教育：${profile.school}${profile.major}专业，预计 ${profile.graduation} 年毕业。`,
      ...profile.experiences.map(
        (item) => `${item.period}，${item.organization}，${item.role}：${item.summary}`,
      ),
      `技术方向：${Object.entries(profile.techFocus)
        .map(([group, items]) => `${group}（${items.join('、')}）`)
        .join('；')}`,
      `公开奖项：${profile.awards.join('、')}`,
    ].join('\n'),
    1500,
  );

  const profileItem: KnowledgeItem = {
    id: 'profile:liufengwei',
    type: 'profile',
    title: `${profile.name} / Profile`,
    slug: 'about',
    url: '/about',
    description: profile.bio,
    category: 'Profile',
    tags: [profile.role, ...focusTags],
    excerpt: profileExcerpt,
  };

  const projectItems: KnowledgeItem[] = projects.map((project) => ({
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
      1200,
    ),
  }));

  const timelineItem: KnowledgeItem = {
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
      1200,
    ),
  };

  return [...articles, profileItem, ...projectItems, timelineItem];
}
