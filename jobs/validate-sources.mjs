import { readFile, writeFile } from 'node:fs/promises';
import { canonicalJob, classifyRole, isUsJob, usRegions } from './rules.mjs';

const config = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
const blocked = JSON.parse(await readFile(new URL('./blocked.json', import.meta.url), 'utf8'));
const seenSourceIds = new Set();
const seenJobKeys = new Set();
const seenCanonicalJobs = new Set();
const sourceReports = [];
const errors = [];
const roleCounts = { software: 0, frontend: 0, java: 0, 'data-engineering': 0, analytics: 0 };
const regionCounts = {};
let relevantJobs = 0;
let duplicatesSkipped = 0;

function hostAllowed(rawUrl, allowedHosts = []) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

for (const source of config.sources || []) {
  const report = {
    id: source.id,
    company: source.company,
    status: 'failed',
    totalJobs: 0,
    relevantUsJobs: 0,
    duplicateJobsSkipped: 0,
    roleCounts: { software: 0, frontend: 0, java: 0, 'data-engineering': 0, analytics: 0 },
    error: null
  };
  try {
    if (!source.id || seenSourceIds.has(source.id)) throw new Error(`Duplicate or missing source id: ${source.id}`);
    seenSourceIds.add(source.id);
    if (source.type !== 'greenhouse') throw new Error(`Unsupported source type: ${source.type}`);
    if (!hostAllowed(source.apiUrl, ['boards-api.greenhouse.io'])) throw new Error('Untrusted API URL');

    const response = await fetch(source.apiUrl, { headers: { 'user-agent': 'share-capsule-job-validator/2.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.jobs)) throw new Error('Response did not contain a jobs array');
    report.totalJobs = payload.jobs.length;

    for (const job of payload.jobs) {
      const role = classifyRole(job);
      if (!role || !isUsJob(job)) continue;
      if (!hostAllowed(job.absolute_url, source.allowedApplyHosts)) throw new Error(`Untrusted apply URL: ${job.absolute_url}`);

      const key = `${source.id}:${job.id}`;
      if (seenJobKeys.has(key)) throw new Error(`Duplicate job key: ${key}`);
      seenJobKeys.add(key);

      const canonical = canonicalJob(job, source.company);
      if (seenCanonicalJobs.has(canonical)) {
        report.duplicateJobsSkipped += 1;
        duplicatesSkipped += 1;
        continue;
      }
      seenCanonicalJobs.add(canonical);

      report.relevantUsJobs += 1;
      report.roleCounts[role.code] += 1;
      roleCounts[role.code] += 1;
      relevantJobs += 1;
      for (const region of usRegions(job)) regionCounts[region] = (regionCounts[region] || 0) + 1;
    }

    report.status = 'passed';
    console.log(`${source.company}: ${report.totalJobs} total, ${report.relevantUsJobs} relevant U.S. jobs, ${report.duplicateJobsSkipped} duplicates skipped`);
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
if (relevantJobs === 0) errors.push('No verified U.S. software, frontend, Java, data engineering or analytics roles were found across working sources');

const validationReport = {
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  scope: 'United States: all 50 states, Washington D.C., and explicitly U.S.-based remote roles',
  sourceCount: sourceReports.length,
  workingSourceCount: sourceReports.filter(source => source.status === 'passed').length,
  relevantJobs,
  duplicatesSkipped,
  roleCounts,
  regionCounts,
  sources: sourceReports,
  errors
};
await writeFile('validation-report.json', JSON.stringify(validationReport, null, 2) + '\n');

if (errors.length) throw new Error(errors.join(' | '));
console.log(`Validation complete: ${relevantJobs} unique U.S. jobs across ${seenSourceIds.size} official sources.`);
console.log(`Role counts: ${JSON.stringify(roleCounts)}`);
