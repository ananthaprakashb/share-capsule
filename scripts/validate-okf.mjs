import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const okfDir = path.join(root, 'okf');
const reserved = new Set(['index.md', 'log.md']);
const requiredKeys = ['type', 'title'];
const errors = [];

function fail(message) {
  errors.push(message);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function parseFrontmatter(text, relativePath) {
  if (!text.startsWith('---\n')) {
    fail(`${relativePath}: missing YAML frontmatter`);
    return {};
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    fail(`${relativePath}: unterminated YAML frontmatter`);
    return {};
  }
  const lines = text.slice(4, end).split('\n');
  const data = {};
  for (const raw of lines) {
    if (!raw.trim() || /^\s+-\s+/.test(raw)) continue;
    const match = raw.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return data;
}

function markdownLinks(text) {
  return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1].trim());
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const files = (await walk(okfDir)).filter(file => file.endsWith('.md'));
const names = new Set(files.map(file => path.relative(okfDir, file).replaceAll('\\', '/')));

for (const required of reserved) {
  if (!names.has(required)) fail(`okf/${required}: required reserved file is missing`);
}

for (const file of files) {
  const relative = path.relative(okfDir, file).replaceAll('\\', '/');
  const text = await readFile(file, 'utf8');

  if (reserved.has(relative)) {
    if (text.startsWith('---\n')) fail(`okf/${relative}: reserved file must not contain frontmatter`);
  } else {
    const frontmatter = parseFrontmatter(text, `okf/${relative}`);
    for (const key of requiredKeys) {
      if (!frontmatter[key]) fail(`okf/${relative}: required frontmatter key '${key}' is missing or empty`);
    }
  }

  for (const href of markdownLinks(text)) {
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(clean));
    if (!target.startsWith(okfDir + path.sep) && target !== okfDir) {
      fail(`okf/${relative}: relative link escapes the OKF directory: ${href}`);
      continue;
    }
    if (!await exists(target)) fail(`okf/${relative}: broken relative link: ${href}`);
  }
}

const indexText = await readFile(path.join(okfDir, 'index.md'), 'utf8');
for (const file of files) {
  const relative = path.relative(okfDir, file).replaceAll('\\', '/');
  if (reserved.has(relative)) continue;
  if (!indexText.includes(`./${relative}`)) fail(`okf/index.md: does not link to ./${relative}`);
}
if (!indexText.includes('./log.md')) fail('okf/index.md: does not link to ./log.md');

const llmsPath = path.join(root, 'llms.txt');
if (!await exists(llmsPath)) fail('llms.txt: discovery file is missing');
else {
  const llms = await readFile(llmsPath, 'utf8');
  if (!llms.includes('https://sharecapsule.app/okf/index.md')) fail('llms.txt: missing canonical OKF index URL');
}

const robotsPath = path.join(root, 'robots.txt');
if (!await exists(robotsPath)) fail('robots.txt: file is missing');
else {
  const robots = await readFile(robotsPath, 'utf8');
  if (!/Allow:\s*\/okf\//i.test(robots)) fail('robots.txt: /okf/ is not explicitly allowed');
}

const sitemapPath = path.join(root, 'sitemap.xml');
if (!await exists(sitemapPath)) fail('sitemap.xml: file is missing');
else {
  const sitemap = await readFile(sitemapPath, 'utf8');
  if (!sitemap.includes('https://sharecapsule.app/okf/index.md')) fail('sitemap.xml: missing canonical OKF index URL');
}

if (errors.length) {
  console.error(`OKF validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OKF validation passed: ${files.length} Markdown files checked.`);
