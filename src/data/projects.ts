export type ProjectStatus = '持续维护' | '已完成';

export interface ProjectHighlight {
  title: string;
  description: string;
}

export interface Project {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  techStack: string[];
  github?: string;
  demo?: string;
  status: ProjectStatus;
  cover: 'aurora' | 'grid' | 'orbit';
  featured: boolean;
  background: string[];
  myWork: string[];
  highlights: ProjectHighlight[];
  challenges: string[];
  flow: string[];
}

export const projects: Project[] = [
  {
    slug: 'lfw-space',
    name: 'LFW Space',
    eyebrow: 'DIGITAL GARDEN / PORTFOLIO',
    description: '面向长期维护的个人技术博客、数字花园与开发者作品集。',
    techStack: ['Astro', 'TypeScript', 'React', 'Pagefind', 'DeepSeek'],
    github: 'https://github.com/kdjfs/liufengwei-personal-blog',
    status: '持续维护',
    cover: 'aurora',
    featured: true,
    background: [
      'LFW Space 用于持续沉淀技术文章、项目案例与个人成长记录，同时作为前端作品集对外展示。',
      '站点保持 Astro 静态输出，让内容页面默认交付 HTML，只在搜索、主题与视觉交互等局部加载客户端代码。',
    ],
    myWork: [
      '设计并实现稳定 Slug、Content Collections Schema 与批量内容导入工具。',
      '搭建分类、标签、系列、归档和 Pagefind 搜索，完善长文章阅读体验。',
      '维护 LFW Space 的 Typography、Grid、深浅主题与响应式视觉语言。',
    ],
    highlights: [
      { title: '内容管线', description: '提供创建、检查、统计、列表与批量导入命令。' },
      { title: '静态优先', description: '文章构建为静态页面，React 仅用于必要的交互岛。' },
      {
        title: '阅读系统',
        description: '包含 TOC、阅读进度、代码复制、Mermaid、KaTeX 与相关文章。',
      },
    ],
    challenges: [
      '让未来数百篇文章仍拥有稳定 URL 与可检查的内容质量。',
      '在品牌视觉与首屏性能之间保持边界。',
    ],
    flow: [
      'Markdown / MDX',
      'Content Schema',
      'Astro Static Build',
      'Pagefind Index',
      'Static Deployment',
    ],
  },
  {
    slug: 'pig-health-smart-medicine',
    name: '面向生猪健康管理智慧医药系统',
    eyebrow: 'AI CONSULTATION / UNIAPP',
    description: '围绕生猪健康管理、AI 问诊和医药信息呈现构建的多端应用。',
    techStack: ['Vue 3', 'UniApp', 'ECharts', 'Vite', 'Axios', 'Ant Design'],
    github: 'https://github.com/linyshdhhcb/PigHealthSmartMedicineicine',
    status: '已完成',
    cover: 'grid',
    featured: false,
    background: [
      '项目面向生猪健康管理场景，将 AI 问诊、医药信息与数据展示组织到统一的客户端体验中。',
    ],
    myWork: [
      '实现 AI 问诊结果的 Markdown 流式渲染，并使用 DOMPurify 处理输出内容。',
      '通过分层加载、Vite 分包与 Gzip 优化资源加载过程。',
      '使用 ECharts 承载健康相关数据的可视化展示。',
    ],
    highlights: [
      {
        title: '流式 AI 交互',
        description: '逐步呈现 Markdown 问诊结果，减少等待过程中的空白感。',
      },
      { title: '输出安全', description: '使用 DOMPurify 清理渲染内容，约束动态 HTML 风险。' },
      {
        title: '加载优化',
        description: '优化记录中首屏耗时约由 4.2s 降至 1.7s，构建产物约由 4.5MB 降至 2.7MB。',
      },
    ],
    challenges: [
      '兼顾 AI 输出的实时呈现、Markdown 表达能力与客户端安全。',
      '在多端运行约束下控制首屏资源体积。',
    ],
    flow: ['用户健康问题', 'AI 问诊', '流式 Markdown', 'DOMPurify', '结构化结果展示'],
  },
  {
    slug: 'tripstar-ai',
    name: '星途智旅 TripStar AI',
    eyebrow: 'AI TRAVEL / MAP EXPERIENCE',
    description: '结合 AI 行程生成、地图路线和知识图谱的智能旅行规划应用。',
    techStack: ['React', 'TypeScript', 'Vite', 'Ant Design', 'ECharts', 'AMap'],
    status: '已完成',
    cover: 'orbit',
    featured: false,
    background: [
      '项目围绕旅行规划场景，将 AI 生成过程、地图路线、知识图谱和问答能力组织在同一套交互流程中。',
    ],
    myWork: [
      '实现 AI 行程生成流程及 WebSocket 进度反馈。',
      '接入 AMap 展示行程路线，并用 ECharts 呈现知识图谱。',
      '构建面向旅行规划上下文的 AI 问答界面。',
    ],
    highlights: [
      { title: '过程可见', description: '通过 WebSocket 呈现 AI 行程生成进度。' },
      { title: '空间表达', description: '将生成结果映射为可查看的地图路线。' },
      { title: '知识关联', description: '通过图谱和问答补充目的地之间的语义连接。' },
    ],
    challenges: [
      '协调异步生成进度与多视图状态。',
      '把文本行程、地图路线和知识关系转化为一致的阅读路径。',
    ],
    flow: ['旅行需求', 'AI 行程生成', 'WebSocket 进度', '地图路线', '知识图谱 / AI 问答'],
  },
];
