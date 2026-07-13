export const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ['DC','District of Columbia']
];

const excludedTitlePattern = /(building engineer|facilities|electrical engineer|mechanical engineer|civil engineer|manufacturing engineer|field service engineer|data center capacity|commissioning engineer|network engineer|security engineer|sales engineer|solutions engineer|support engineer)/i;
const dataEngineeringPattern = /(data\s+(?:platform\s+|warehouse\s+|infrastructure\s+|pipeline\s+)?engineer|data\s+architect|etl\s+(?:engineer|developer)|database\s+engineer)/i;
const analyticsPattern = /(analytics?\s+engineer|data\s+analyst|product\s+analyst|business\s+intelligence|bi\s+engineer|decision\s+scientist)/i;
const frontendPattern = /(front[\s-]?end\s+(?:software\s+)?(?:engineer|developer)|(?:software\s+)?engineer[,\s-]+front[\s-]?end|ui\s+engineer|react\s+(?:engineer|developer)|web\s+application\s+engineer)/i;
const javaTitlePattern = /(?:^|\b)(?:senior\s+|staff\s+|principal\s+|lead\s+)?java\s+(?:software\s+)?(?:engineer|developer)\b/i;
const softwarePattern = /(software\s+(?:development\s+)?engineer|software\s+developer|full[\s-]?stack\s+(?:engineer|developer)|back[\s-]?end\s+(?:engineer|developer)|application\s+(?:engineer|developer)|platform\s+(?:software\s+)?engineer)/i;
const countryPattern = /\b(?:United States(?: of America)?|USA|U\.?S\.?A?\.?)\b/i;
const remotePattern = /\bremote\b/i;
const remoteUsPattern = /(?:remote.{0,45}(?:United States|USA|U\.?S\.?A?\.?)|(?:United States|USA|U\.?S\.?A?\.?).{0,45}remote)/i;

export function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function javaSignalCount(content) {
  const signals = [
    /\bjava(?:\s+(?:8|11|17|21))?\b/i,
    /\bspring(?:\s+boot)?\b/i,
    /\bjvm\b/i,
    /\bhibernate\b/i,
    /\b(?:maven|gradle)\b/i
  ];
  return signals.reduce((count, pattern) => count + Number(pattern.test(content)), 0);
}

export function classifyRole(job) {
  const title = cleanText(job?.title);
  const content = cleanText(job?.content);
  if (!title || excludedTitlePattern.test(title)) return null;
  if (dataEngineeringPattern.test(title)) return { code: 'data-engineering', label: 'Data engineering' };
  if (analyticsPattern.test(title)) return { code: 'analytics', label: 'Analytics' };
  if (frontendPattern.test(title)) return { code: 'frontend', label: 'Frontend engineering' };
  if (javaTitlePattern.test(title)) return { code: 'java', label: 'Java engineering' };
  if (softwarePattern.test(title) && javaSignalCount(content) >= 2) return { code: 'java', label: 'Java engineering' };
  if (softwarePattern.test(title)) return { code: 'software', label: 'Software engineering' };
  return null;
}

function codePattern(code) {
  return new RegExp(`(?:^|,\\s*|;\\s*|\\/\\s*|\\(\\s*|[-–—]\\s*)${code}(?=$|\\s*[,;/)]|\\s*[-–—])`, 'i');
}

export function stateCodesFromLocation(value) {
  const location = cleanText(value);
  const codes = [];
  for (const [code, name] of US_STATES) {
    const namePattern = new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`, 'i');
    const dcAlias = code === 'DC' && /\bWashington,\s*D\.?C\.?\b/i.test(location);
    if (namePattern.test(location) || codePattern(code).test(location) || dcAlias) codes.push(code);
  }
  return [...new Set(codes)];
}

export function usRegions(job) {
  const location = cleanText(job?.location?.name || job?.location || '');
  const content = cleanText(job?.content);
  const states = stateCodesFromLocation(location);
  if (states.length) {
    if (remotePattern.test(location)) states.push('REMOTE');
    return [...new Set(states)];
  }
  if (countryPattern.test(location)) return remotePattern.test(location) ? ['REMOTE', 'US'] : ['US'];
  if (remotePattern.test(location) && remoteUsPattern.test(`${location} ${content}`)) return ['REMOTE', 'US'];
  return [];
}

export function isUsJob(job) {
  return usRegions(job).length > 0;
}

export function canonicalJob(job, company = '') {
  return [company, cleanText(job?.title), cleanText(job?.location?.name || job?.location || '')]
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
