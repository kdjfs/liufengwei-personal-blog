export interface QuickAction {
  label: string;
  prompt: string;
}

export const articleQuickActions: QuickAction[] = [
  {
    label: '总结当前文章',
    prompt: '请结合当前文章和我的阅读进度，只总结我目前已经读到的内容。',
  },
  {
    label: '解释选中内容',
    prompt: '请优先基于当前正在阅读的章节，用通俗语言解释核心原理和容易混淆的点。',
  },
  {
    label: '按顺序列出系列',
    prompt: '如果当前文章属于系列，请按系列阅读顺序列出全部文章。',
  },
  {
    label: '面试怎么回答',
    prompt: '请把当前文章的核心知识整理成一段结构清晰的面试回答。',
  },
];

export const generalQuickActions: QuickAction[] = [
  { label: '总结当前页面', prompt: '请基于当前页面内容做一个简洁总结。' },
  { label: '解释选中内容', prompt: '请解释我在文章中选中的内容；如果没有选区，请告诉我如何使用。' },
  { label: '按顺序列出系列', prompt: '请按顺序列出 MySQL 与 Redis 系列全部文章。' },
  { label: '面试怎么回答', prompt: '请推荐一个博客里的高频知识点，并示范面试怎么回答。' },
];
