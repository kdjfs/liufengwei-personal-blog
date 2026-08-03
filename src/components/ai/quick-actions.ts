export interface QuickAction {
  label: string;
  prompt: string;
}

export const articleQuickActions: QuickAction[] = [
  {
    label: '总结我当前读到的内容',
    prompt: '请结合当前文章和我的阅读进度，只总结我目前已经读到的内容。',
  },
  {
    label: '解释当前章节',
    prompt: '请优先基于当前正在阅读的章节，用通俗语言解释核心原理和容易混淆的点。',
  },
  {
    label: '当前章节出 3 道题',
    prompt: '请只基于当前章节出 3 道由浅入深的题，先不要给答案。',
  },
  {
    label: '检查我的理解',
    prompt: '请引导我说出对当前章节的理解，再逐点检查和纠正，不要预设我的私人批注内容。',
  },
  {
    label: '继续学习这一章',
    prompt: '请根据当前阅读进度告诉我接下来该学哪一部分，并给出一个简短的学习目标。',
  },
];

export const generalQuickActions: QuickAction[] = [
  { label: '介绍一下这个博客', prompt: '请基于博客资料，简洁介绍一下 LFW Space。' },
  { label: '刘凤伟做过哪些项目？', prompt: '请基于博客公开资料，介绍刘凤伟做过的项目。' },
  { label: '推荐几篇值得看的文章', prompt: '请从博客资料中推荐几篇值得看的文章，并说明理由。' },
  { label: '我可以问你什么？', prompt: '介绍一下你能基于这个博客帮助我做什么。' },
];
