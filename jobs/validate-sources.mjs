import { readFile, writeFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
const blocked = JSON.parse(await readFile(new URL('./blocked.json', import.meta.url), 'utf8'));
const rolePattern = /(data\s+(?:platform\s+|warehouse\s+|infrastructure\s+)?engineer|analytics?\s+engineer|data\s+analyst|product\s+analyst|business\s+intelligence|bi\s+engineer|decision\s+scientist|data\s+architect)/i;
const excludedPattern = /(building engineer|facilities|electrical engineer|mechanical engineer|data center capacity|commissioning engineer)/i;
const seenSourceIds = new Set();
const seenJobKeys = new Set();
const sourceReports = [];
const errors = [];
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
  const report = { id: source.id, company: source.company, status: 'failed', totalJobs: 0, relevantJobs: 0, error: null };
  try {
    if (!source.id || seenSourceIds.has(source.id)) throw new Error(`Duplicate or missing source id: ${source.id}`);
    seenSourceIds.add(source.id);
    if (source.type !== 'greenhouse') throw new Error(`Unsupported source type: ${source.type}`);
    if (!hostAllowed(source.apiUrl, ['boards-api.greenhouse.io'])) throw new Error('Untrusted API URL');

    const response = await fetch(source.apiUrl, { headers: { 'user-agent': 'share-capsule-job-validator/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.jobs)) throw new Error('Response did not contain a jobs array');
    report.totalJobs = payload.jobs.length;

    for (const job of payload.jobs) {
      const title = String(job.title || '');
      if (!rolePattern.test(title) || excludedPattern.test(title)) continue;
      if (!hostAllowed(job.absolute_url, source.allowedApplyHosts)) {
        throw new Error(`Untrusted apply URL: ${job.absolute_url}`);
      }
      const key = `${source.id}:${job.id}`;
      if (seenJobKeys.has(key)) throw new Error(`Duplicate job key: ${key}`);
      seenJobKeys.add(key);
      report.relevantJobs += 1;
      relevantJobs += 1;
    }

    report.status = 'passed';
    console.log(`${source.company}: ${report.totalJobs} total, ${report.relevantJobs} relevant`);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    errors.push(`${source.company || source.id}: ${report.error}`);
    console.error(`${source.company || source.id}: ${report.error}`);
  }
  sourceReports.push(report);
}

for (const key of blocked.jobKeys || []) {
  if (typeof key !== 'string' || !key.trim()) errors.push('blocked.json contains an invalid job key');
}
for (const url of blocked.urls || []) {
  if (!String(url).startsWith('https://')) errors.push(`blocked.json contains an invalid URL: ${url}`);
}
if (relevantJobs === 0) errors.push('No relevant data engineering or analytics roles were found across working sources');

const validationReport = {
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  sourceCount: sourceReports.length,
  workingSourceCount: sourceReports.filter(source => source.status === 'passed').length,
  relevantJobs,
  sources: sourceReports,
  errors
};
await writeFile('validation-report.json', JSON.stringify(validationReport, null, 2) + '\n');

if (errors.length) throw new Error(errors.join(' | '));
console.log(`Validation complete: ${relevantJobs} relevant live jobs across ${seenSourceIds.size} official sources.`);
