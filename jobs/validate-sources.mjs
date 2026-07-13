import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
const blocked = JSON.parse(await readFile(new URL('./blocked.json', import.meta.url), 'utf8'));
const rolePattern = /(data\s+(?:platform\s+|warehouse\s+|infrastructure\s+)?engineer|analytics?\s+engineer|data\s+analyst|product\s+analyst|business\s+intelligence|bi\s+engineer|decision\s+scientist|data\s+architect)/i;
const excludedPattern = /(building engineer|facilities|electrical engineer|mechanical engineer|data center capacity|commissioning engineer)/i;
const seenSourceIds = new Set();
const seenJobKeys = new Set();
let relevantJobs = 0;

function hostAllowed(rawUrl, allowedHosts = []) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

for (const source of config.sources || []) {
  if (!source.id || seenSourceIds.has(source.id)) throw new Error(`Duplicate or missing source id: ${source.id}`);
  seenSourceIds.add(source.id);
  if (source.type !== 'greenhouse') throw new Error(`Unsupported source type for ${source.id}: ${source.type}`);
  if (!hostAllowed(source.apiUrl, ['boards-api.greenhouse.io'])) throw new Error(`Untrusted API URL for ${source.id}`);

  const response = await fetch(source.apiUrl, { headers: { 'user-agent': 'share-capsule-job-validator/1.0' } });
  if (!response.ok) throw new Error(`${source.id} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.jobs)) throw new Error(`${source.id} did not return a jobs array`);

  let sourceRelevant = 0;
  for (const job of payload.jobs) {
    const title = String(job.title || '');
    if (!rolePattern.test(title) || excludedPattern.test(title)) continue;
    if (!hostAllowed(job.absolute_url, source.allowedApplyHosts)) {
      throw new Error(`${source.id} returned an untrusted apply URL: ${job.absolute_url}`);
    }
    const key = `${source.id}:${job.id}`;
    if (seenJobKeys.has(key)) throw new Error(`Duplicate job key: ${key}`);
    seenJobKeys.add(key);
    sourceRelevant += 1;
    relevantJobs += 1;
  }

  console.log(`${source.company}: ${payload.jobs.length} total, ${sourceRelevant} relevant`);
}

for (const key of blocked.jobKeys || []) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('blocked.json contains an invalid job key');
}
for (const url of blocked.urls || []) {
  if (!String(url).startsWith('https://')) throw new Error(`blocked.json contains an invalid URL: ${url}`);
}

if (relevantJobs === 0) throw new Error('No relevant data engineering or analytics roles were found across all sources');
console.log(`Validation complete: ${relevantJobs} relevant live jobs across ${seenSourceIds.size} official sources.`);
