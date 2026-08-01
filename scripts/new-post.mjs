import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith('--')) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, 'true');
  }
}

const input = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (key, prompt) => args.get(key) ?? (await input.question(prompt));

function slugify(title) {
  const ascii = title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // 纯中文标题无法可靠无依赖转拼音，采用可读前缀 + 时间戳，保证跨平台文件名合法且不碰撞。
  return (
    ascii ||
    `post-${new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)}`
  );
}

function yamlString(value) {
  return JSON.stringify(value.trim());
}

try {
  const title = (await ask('title', '请输入文章标题：')).trim();
  const category = (await ask('category', '请输入分类：')).trim();
  const tagsInput = (await ask('tags', '请输入标签（使用英文逗号分隔）：')).trim();
  const description = (await ask('description', '请输入摘要：')).trim();
  const customSlug = args.get('slug')?.trim();

  if (!title || !category || !tagsInput || !description) {
    throw new Error('标题、分类、标签和摘要均不能为空。');
  }
  if (description.length < 10 || description.length > 220) {
    throw new Error('摘要长度需要在 10 到 220 个字符之间。');
  }

  const tags = [
    ...new Set(
      tagsInput
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  if (tags.length === 0 || tags.length > 8) throw new Error('标签数量需要在 1 到 8 个之间。');

  const slug = slugify(customSlug || title);
  const publishDate = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `publishDate: ${publishDate}`,
    `category: ${yamlString(category)}`,
    'tags:',
    ...tags.map((tag) => `  - ${yamlString(tag)}`),
    'cover: grid',
    'draft: true',
    'featured: false',
    '---',
    '',
    `# ${title}`,
    '',
    '<!-- TODO: 在这里开始写作。完成后将 draft 改为 false。 -->',
    '',
  ].join('\n');

  const directory = path.resolve('src/content/blog');
  const target = path.join(directory, `${slug}.md`);

  if (args.has('dry-run')) {
    console.log(`\n[预览] 将创建：${target}\n\n${frontmatter}`);
  } else {
    await mkdir(directory, { recursive: true });
    try {
      await access(target);
      throw new Error(`文件已存在：${target}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('文件已存在')) throw error;
    }
    // wx 可防止并发或误操作覆盖已经存在的文章。
    await writeFile(target, frontmatter, { encoding: 'utf8', flag: 'wx' });
    console.log(`\n已创建：${target}`);
    console.log('文章默认为 draft: true，完成后改为 false 即可发布。');
  }
} catch (error) {
  console.error(`\n创建失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  input.close();
}
