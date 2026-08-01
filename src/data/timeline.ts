export interface TimelineItem {
  date: string;
  title: string;
  description: string;
  type: 'site' | 'learning' | 'milestone';
  placeholder?: boolean;
}

/** 仅首条为本站事实；其余项目明确标记为待补充，避免虚构个人经历。 */
export const timeline: TimelineItem[] = [
  {
    date: '2026-08',
    title: 'LFW Space V1 启动',
    description: '建立独立的 Astro 静态博客架构，开始长期维护这座数字花园。',
    type: 'site',
  },
  {
    date: 'TODO',
    title: '补充一段真实里程碑',
    description: '可以是一次学习突破、项目发布或值得记住的技术选择。',
    type: 'milestone',
    placeholder: true,
  },
  {
    date: 'TODO',
    title: '补充更早的成长节点',
    description: '按时间倒序维护，描述事实与收获，不需要包装成履历。',
    type: 'learning',
    placeholder: true,
  },
];
