import fs from 'node:fs/promises';

const DATA_PATH = new URL('./data.json', import.meta.url);
const FORCE = process.argv.includes('--force');

const decodeEntities = value => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const slugify = value => String(value ?? '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || `story-${Date.now()}`;

function pacificParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

function canonicalLink(entry) {
  return (entry.link || []).find(link => link.rel === 'alternate')?.href || '';
}

function authorName(entry) {
  return entry.author?.[0]?.name?.$t || 'Think Five Minutes';
}

async function main() {
  const data = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  const now = new Date();
  const pacific = pacificParts(now);
  if (!FORCE && pacific.hour !== '08') {
    console.log(`Skipping: current America/Los_Angeles hour is ${pacific.hour}, not 08.`);
    return;
  }

  const today = `${pacific.year}-${pacific.month}-${pacific.day}`;
  if (!FORCE && (data.stories || []).some(story => story.publishedOn === today)) {
    console.log(`Skipping: a story is already published for ${today}.`);
    return;
  }

  const response = await fetch(data.site.feedUrl, {
    headers: { 'user-agent': 'ShareCapsuleStoryImporter/1.0' }
  });
  if (!response.ok) throw new Error(`Blogger feed returned HTTP ${response.status}`);
  const feed = await response.json();
  const entries = feed.feed?.entry || [];
  if (!entries.length) throw new Error('The Blogger feed returned no posts.');

  const publishedUrls = new Set((data.stories || []).map(story => story.sourceUrl));
  const seedUrl = data.site.seedSourceUrl;
  let selected = entries.find(entry => canonicalLink(entry) === seedUrl && !publishedUrls.has(seedUrl));

  if (!selected) {
    selected = [...entries]
      .filter(entry => !publishedUrls.has(canonicalLink(entry)))
      .sort((a, b) => new Date(a.published?.$t || 0) - new Date(b.published?.$t || 0))[0];
  }

  if (!selected) {
    console.log('No unpublished Blogger posts remain.');
    return;
  }

  const sourceUrl = canonicalLink(selected);
  const title = decodeEntities(selected.title?.$t || 'Untitled story').trim();
  const contentText = htmlToText(selected.content?.$t || selected.summary?.$t || '');
  if (!sourceUrl || !contentText) throw new Error('Selected post is missing a canonical URL or readable content.');

  const originalPublishedAt = selected.published?.$t || '';
  const story = {
    id: slugify(`${title}-${originalPublishedAt.slice(0, 10)}`),
    title,
    author: authorName(selected),
    contentText,
    excerpt: contentText.slice(0, 260).trim() + (contentText.length > 260 ? '…' : ''),
    sourceUrl,
    sourceName: data.site.sourceName,
    originalPublishedAt,
    publishedOn: today,
    importedAt: now.toISOString()
  };

  data.stories = [story, ...(data.stories || [])];
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Published story: ${title} (${sourceUrl})`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
