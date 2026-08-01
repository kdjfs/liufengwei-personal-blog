export const siteConfig = {
  name: 'LFW Space',
  shortName: 'LFW.',
  titleTemplate: '%s · LFW Space',
  author: '刘凤伟',
  subtitle: '刘凤伟的数字花园',
  description: '记录技术、项目、思考与成长。一个持续生长的个人技术博客与数字花园。',
  url: 'https://lfw-space.vercel.app',
  language: 'zh-CN',
  github: 'https://github.com/', // TODO: 替换为刘凤伟的 GitHub 主页
  email: '', // TODO: 如需公开联系邮箱，在此填写
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/blog' },
    { label: '项目', href: '/projects' },
    { label: '时间线', href: '/timeline' },
    { label: '关于', href: '/about' },
  ],
  footer: {
    note: '在时间的缝隙里，持续构建。',
  },
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
