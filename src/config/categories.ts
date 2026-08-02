import type { BlogCoverName } from '@/utils/blog-cover';

export interface FeaturedCategory {
  name: string;
  cover: BlogCoverName;
  description: string;
}

export const featuredCategories: FeaturedCategory[] = [
  {
    name: '前端',
    cover: '1.jpg',
    description: 'Vue、React、JavaScript 与浏览器相关内容',
  },
  {
    name: '后端',
    cover: '2.jpg',
    description: 'Node.js、MySQL、Redis 与服务端基础',
  },
  { name: 'AI', cover: '3.jpg', description: 'LLM、Agent、RAG、MCP 与 AI 应用' },
  { name: '算法', cover: '4.jpg', description: '算法、数据结构与源码中的核心思想' },
  { name: '面经', cover: '5.jpg', description: '面试记录、面试复盘与高频考点' },
  { name: '项目', cover: '6.jpg', description: '项目开发、技术决策与工程实践' },
  { name: '笔记', cover: '7.jpg', description: '学习过程中的技术记录与知识整理' },
  { name: '生活', cover: '8.jpg', description: '技术之外值得记录的生活与思考' },
];
