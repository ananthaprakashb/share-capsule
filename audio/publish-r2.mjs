import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const AUDIO_PATH = new URL('./data.json', import.meta.url);
const OVERRIDES_PATH = new URL('./publish-overrides.json', import.meta.url);
const RELEASES_PATH = new URL('../data/releases.json', import.meta.url);
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.m4a', '.mp3', '.aac', '.wav', '.ogg', '.flac']);
const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || 'https://pub-7cc02c56240d42c98154d45ae3b67481.r2.dev').replace(/\/$/, '');
const BUCKET = process.env.R2_BUCKET || 'techvideos';
const SEED_ONLY = process.env.SEED_ONLY === 'true';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const extension = key => key.slice(key.lastIndexOf('.')).toLowerCase();
const withoutExtension = key => key.replace(/\.[^.]+$/, '');
const publicUrl = key => `${PUBLIC_BASE_URL}/${key.split('/').map(encodeURIComponent).join('/')}`;
const hasTamil = value => /[\u0B80-\u0BFF]/.test(value);
const normalizeTitle = key => withoutExtension(key.split('/').pop()).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const asciiSlug = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stableId = (title, key) => asciiSlug(title) || `audio-${createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
const mimeType = key => extension(key) === '.mp3' ? 'audio/mpeg' : extension(key) === '.ogg' ? 'audio/ogg' : extension(key) === '.wav' ? 'audio/wav' : extension(key) === '.flac' ? 'audio/flac' : extension(key) === '.mp4' ? 'video/mp4' : 'audio/mp4';
const coverLines = title => {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 3) return words;
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
};

function buildAudio(key, override = {}, lastModified = null) {
  const title = override.title || normalizeTitle(key);
  const language = override.language || (hasTamil(title) ? 'Tamil' : 'English');
  const id = override.id || stableId(title, key);
  return {
    id,
    title,
    creator: override.creator || 'Share Capsule',
    description: override.description || `${language === 'Tamil' ? 'தமிழில் வழங்கப்படும்' : 'An'} audio article from Share Capsule: ${title}.`,
    category: override.category || (language === 'Tamil' ? 'Tamil Audio' : 'Audio Article'),
    language,
    publishedAt: override.publishedAt || (lastModified ? new Date(lastModified).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    objectKey: key,
    mediaUrl: publicUrl(key),
    mimeType: override.mimeType || mimeType(key),
    autoplay: override.autoplay !== false,
    coverBackground: override.coverBackground || 'linear-gradient(145deg,#172554,#0f766e 55%,#7c3aed)',
    coverLines: override.coverLines || coverLines(title),
    references: []
  };
}

function buildRelease(item, override = {}) {
  const route = `/audio/?id=${encodeURIComponent(item.id)}`;
  return {
    slug: item.id,
    title: item.title,
    artist: item.creator,
    type: 'Audio article',
    category: item.category,
    language: item.language,
    publishedAt: item.publishedAt,
    description: item.description,
    featured: true,
    coverImage: '',
    coverBackground: item.coverBackground,
    coverEyebrow: override.coverEyebrow || (item.language === 'Tamil' ? 'தமிழ் ஆடியோ கட்டுரை' : 'Audio article'),
    coverLines: item.coverLines,
    previewUrl: '',
    demoTone: false,
    audioPageUrl: route,
    platforms: [{ label: 'Listen', icon: '▶', url: route }],
    shareMessages: {
      friend: { label: 'Friend', icon: '🎧', text: item.language === 'Tamil' ? `இந்த தமிழ் ஆடியோ கட்டுரையை கேளுங்கள்: ${item.title}` : `Listen to this Share Capsule audio article: ${item.title}` },
      family: { label: 'Family', icon: '👨‍👩‍👧', text: item.language === 'Tamil' ? `குடும்பத்துடன் பகிர வேண்டிய தமிழ் ஆடியோ: ${item.title}` : `Sharing this audio article with you: ${item.title}` },
      topic: { label: item.language === 'Tamil' ? 'தமிழ் கேட்பவர்' : 'Audio learner', icon: '🧠', text: item.description }
    }
  };
}

async function listR2Objects() {
  if (SEED_ONLY) return [];
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Missing GitHub secrets: ${missing.join(', ')}`);
  const { S3Client, ListObjectsV2Command, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
  });
  const objects = [];
  let ContinuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken, Prefix: process.env.R2_AUDIO_PREFIX || undefined }));
    for (const object of page.Contents || []) {
      if (!object.Key || object.Size === 0) continue;
      const ext = extension(object.Key);
      if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext) && ext !== '.mp4') continue;
      let contentType = '';
      if (ext === '.mp4') {
        const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: object.Key }));
        contentType = String(head.ContentType || '').toLowerCase();
      }
      objects.push({ key: object.Key, lastModified: object.LastModified || null, contentType });
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

const [audioData, releasesData, overridesData] = await Promise.all([readJson(AUDIO_PATH), readJson(RELEASES_PATH), readJson(OVERRIDES_PATH)]);
const overrides = overridesData.objects || {};
const existingKeys = new Set((audioData.audio || []).map(item => item.objectKey));
const existingIds = new Set((audioData.audio || []).map(item => item.id));
const existingReleaseSlugs = new Set((releasesData.releases || []).map(item => item.slug));
const discovered = await listR2Objects();
const candidates = new Map(discovered.map(object => [object.key, object]));
for (const [key, override] of Object.entries(overrides)) {
  if (override.forcePublish) candidates.set(key, candidates.get(key) || { key, lastModified: null, contentType: '' });
}

const added = [];
for (const object of candidates.values()) {
  if (existingKeys.has(object.key)) continue;
  const override = overrides[object.key] || {};
  const ext = extension(object.key);
  if (ext === '.mp4' && !override.forcePublish && !object.contentType.startsWith('audio/')) continue;
  const item = buildAudio(object.key, override, object.lastModified);
  if (existingIds.has(item.id) || existingReleaseSlugs.has(item.id)) continue;
  audioData.audio.unshift(item);
  releasesData.releases.unshift(buildRelease(item, override));
  existingKeys.add(object.key);
  existingIds.add(item.id);
  existingReleaseSlugs.add(item.id);
  added.push({ id: item.id, title: item.title, objectKey: item.objectKey });
}

if (added.length) {
  await Promise.all([
    writeFile(AUDIO_PATH, JSON.stringify(audioData, null, 2) + '\n'),
    writeFile(RELEASES_PATH, JSON.stringify(releasesData, null, 2) + '\n')
  ]);
}
console.log(JSON.stringify({ bucket: BUCKET, seedOnly: SEED_ONLY, discovered: discovered.length, added }, null, 2));
