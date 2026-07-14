import { readFile, writeFile } from 'node:fs/promises';

const dataPath = 'law/data.json';
const reportPath = 'law/validation-report.json';
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const required = [
  'id','category','title','plainRule','globalBasis','globalSourceTitle','globalSourceUrl',
  'secondaryGlobalSourceTitle','secondaryGlobalSourceUrl','everydayMeaning','practicalSteps',
  'incidentTitle','incidentDate','incidentJurisdiction','incidentSummary','incidentOutcome',
  'incidentSourceTitle','incidentSourceUrl','takeaway','localLawWarning'
];

const authorityHosts = [
  'ohchr.org','un.org','undocs.org','unctad.org','hudoc.echr.coe.int','echr.coe.int',
  'supremecourt.gov','uscourts.gov','justice.gov','ftc.gov','cpsc.gov','dol.gov',
  'eeoc.gov','nlrb.gov','consumerfinance.gov','sec.gov','federalregister.gov',
  'legislation.gov.uk','supremecourt.uk','curia.europa.eu','icj-cij.org','icc-cpi.int',
  'indiacode.nic.in','sci.gov.in','main.sci.gov.in'
];

const hostAllowed = raw => {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && authorityHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch { return false; }
};

async function checkUrl(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'share-capsule-law-validator/1.0', accept: 'text/html,application/pdf,*/*;q=0.8' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { finalUrl: response.url, status: response.status, contentType: response.headers.get('content-type') || '' };
}

const report = { validatedAt: new Date().toISOString(), pacificDate: today, policy: 'primary-authority-only', passed: 0, failed: 0, entries: [] };
const seen = new Set();
for (const item of data.principles || []) {
  const errors = [];
  if (seen.has(item.id)) errors.push('duplicate id');
  seen.add(item.id);
  for (const field of required) {
    if (item[field] == null || item[field] === '' || (field === 'practicalSteps' && !Array.isArray(item[field]))) errors.push(`missing ${field}`);
  }
  if (!Array.isArray(item.practicalSteps) || item.practicalSteps.length < 3) errors.push('at least three practical steps required');
  for (const [label, url] of [['global', item.globalSourceUrl], ['secondary', item.secondaryGlobalSourceUrl], ['incident', item.incidentSourceUrl]]) {
    if (!hostAllowed(url)) { errors.push(`${label} source is not an approved primary authority`); continue; }
    try { await checkUrl(url); } catch (error) { errors.push(`${label} source unavailable: ${error.message}`); }
  }
  const status = errors.length ? 'failed' : 'passed';
  report[status]++;
  report.entries.push({ id: item.id, title: item.title, status, errors });
}

if (!report.entries.length) throw new Error('No legal entries found');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
if (report.failed) {
  console.error(JSON.stringify(report, null, 2));
  throw new Error(`${report.failed} legal entr${report.failed === 1 ? 'y' : 'ies'} failed validation`);
}

data.site ||= {};
data.site.lastRevalidatedAt = new Date().toISOString();
data.site.validationPolicy = 'Every entry must cite two primary legal authorities plus a primary court, tribunal or government-agency record for the specific case or incident. All required fields and source URLs are checked before publication.';
for (const item of data.principles) item.validatedOn = today;
await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Validated ${report.passed} legal entries against primary sources.`);
