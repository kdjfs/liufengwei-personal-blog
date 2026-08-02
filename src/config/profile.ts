export interface SocialLink {
  label: 'GitHub' | '掘金' | 'Bilibili' | 'Email';
  href: string;
  icon: 'github' | 'juejin' | 'bilibili' | 'email';
  external: boolean;
}

export interface Experience {
  period: string;
  organization: string;
  shortOrganization: string;
  role: string;
  summary: string;
}

export const profile = {
  name: '刘凤伟',
  englishName: 'LIU FENGWEI',
  role: '前端开发 / AI Agent 应用开发',
  school: '广东金融学院',
  major: '数学与应用数学',
  graduation: 2027,
  educationPeriod: '2023.09 - 2027.06',
  avatar: '/avatar.webp',
  bio: '前端开发学习者，关注 Vue、React、Node.js 与 AI Agent 应用开发。这里记录项目实践、源码学习、工程思考与持续成长。',
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/kdjfs',
      icon: 'github',
      external: true,
    },
    {
      label: '掘金',
      href: 'https://juejin.cn/user/2826210963370939',
      icon: 'juejin',
      external: true,
    },
    {
      label: 'Bilibili',
      href: 'https://space.bilibili.com/609903342?spm_id_from=333.1007.0.0',
      icon: 'bilibili',
      external: true,
    },
    {
      label: 'Email',
      href: 'mailto:lfw2663040734@qq.com',
      icon: 'email',
      external: false,
    },
  ] satisfies SocialLink[],
  experiences: [
    {
      period: '2026.03 - 至今',
      organization: '用友网络科技股份有限公司',
      shortOrganization: '用友网络',
      role: '前端开发实习生（客开部）',
      summary: '前端开发实习生',
    },
    {
      period: '2025.11 - 2026.03',
      organization: '软子数字软件有限公司',
      shortOrganization: '软子数字',
      role: '中跃 AI 智能硬件控制 App',
      summary: '智能硬件 App 开发',
    },
    {
      period: '2025.06 - 2025.10',
      organization: '东华同创信息科技有限公司',
      shortOrganization: '东华同创',
      role: '万福鉴酒 · 前端开发（主要开发）',
      summary: '万福鉴酒前端开发',
    },
  ] satisfies Experience[],
  techFocus: {
    Frontend: ['Vue 3', 'React', 'TypeScript', 'Astro', 'UniApp'],
    Engineering: ['Vite', '前端性能', '内容工程', '可访问性'],
    Backend: ['Node.js', 'REST API'],
    AI: ['AI Agent 应用', '流式渲染', 'AI 交互体验'],
    'Visualization / Client': ['ECharts', 'WebGL', 'AMap'],
  },
  awards: ['全国大学生统计建模大赛二等奖', '全国大学生数学建模大赛优胜奖', '软件著作权 3 项'],
} as const;

export const githubUrl = profile.socials[0].href;
