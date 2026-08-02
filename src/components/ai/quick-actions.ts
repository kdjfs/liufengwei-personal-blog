export interface QuickAction {
  label: string;
  prompt: string;
}

export const articleQuickActions: QuickAction[] = [
  {
    label: '总结这篇文章',
    prompt: '请基于当前文章，用 5 个要点总结核心内容，并给出一句话结论。',
  },
  {
    label: '用面试回答的方式解释',
    prompt: '请基于当前文章，把内容整理成前端面试时 2 分钟可以回答的版本。',
  },
  {
    label: '提炼核心知识点',
    prompt: '请基于当前文章，提炼最值得记住的核心知识点，并标出容易混淆的地方。',
  },
  {
    label: '基于本文出 5 道面试题',
    prompt: '请基于当前文章出 5 道由浅入深的面试题，并在每题后给出简洁参考答案。',
  },
];

export const generalQuickActions: QuickAction[] = [
  { label: '介绍一下这个博客', prompt: '请基于博客资料，简洁介绍一下 LFW Space。' },
  { label: '刘凤伟做过哪些项目？', prompt: '请基于博客公开资料，介绍刘凤伟做过的项目。' },
  { label: '推荐几篇值得看的文章', prompt: '请从博客资料中推荐几篇值得看的文章，并说明理由。' },
  { label: '我可以问你什么？', prompt: '介绍一下你能基于这个博客帮助我做什么。' },
];
