export interface TimelineItem {
  date: string;
  title: string;
  description: string;
  type: 'site' | 'experience' | 'education';
}

export const timeline: TimelineItem[] = [
  {
    date: '2026.08',
    title: 'LFW Space 启动',
    description: '开始构建并持续维护个人技术博客、数字花园与作品集。',
    type: 'site',
  },
  {
    date: '2026.03',
    title: '用友网络',
    description: '进入客开部，担任前端开发实习生。',
    type: 'experience',
  },
  {
    date: '2025.11',
    title: '软子数字',
    description: '参与中跃 AI 智能硬件控制 App 开发。',
    type: 'experience',
  },
  {
    date: '2025.06',
    title: '东华同创',
    description: '参与万福鉴酒项目，承担主要前端开发工作。',
    type: 'experience',
  },
  {
    date: '2023.09',
    title: '进入广东金融学院',
    description: '就读数学与应用数学专业。',
    type: 'education',
  },
];
