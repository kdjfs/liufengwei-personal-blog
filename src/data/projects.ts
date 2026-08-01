export type ProjectStatus = '构思中' | '开发中' | '持续维护' | '已完成';

export interface Project {
  name: string;
  description: string;
  techStack: string[];
  github?: string;
  demo?: string;
  status: ProjectStatus;
  cover: 'aurora' | 'grid' | 'orbit';
  featured: boolean;
  placeholder?: boolean;
}

/** 示例项目只验证作品集结构，不代表作者真实经历或成果。 */
export const projects: Project[] = [
  {
    name: 'LFW Space',
    description: '正在构建的个人博客、作品集与数字花园，也是本站架构本身的持续实验。',
    techStack: ['Astro', 'TypeScript', 'React', 'Tailwind CSS'],
    status: '持续维护',
    cover: 'aurora',
    featured: true,
  },
  {
    name: '下一个代表项目',
    description: 'TODO：在这里补充真实项目背景、你的职责、技术取舍与可验证结果。',
    techStack: ['TODO'],
    status: '构思中',
    cover: 'grid',
    featured: false,
    placeholder: true,
  },
  {
    name: '开源实验场',
    description: 'TODO：替换为真实的开源仓库，说明它解决的问题，而不是堆砌虚构指标。',
    techStack: ['TODO'],
    status: '构思中',
    cover: 'orbit',
    featured: false,
    placeholder: true,
  },
];
