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

const rolePatterns = [
  ['ai-ml','AI and machine learning',/(machine learning|ml engineer|artificial intelligence|ai engineer|applied scientist|research scientist|computer vision|natural language processing|nlp engineer|generative ai|deep learning)/i],
  ['cloud-sre','Cloud, DevOps and SRE',/(site reliability|\bsre\b|devops|cloud engineer|cloud architect|platform reliability|infrastructure engineer|production engineer|release engineer|build engineer)/i],
  ['cybersecurity','Cybersecurity',/(cybersecurity|cyber security|security engineer|application security|product security|cloud security|information security|security operations|soc analyst|threat|incident response|penetration test|identity and access|iam engineer)/i],
  ['network-systems','Network and systems engineering',/(network engineer|network architect|systems engineer|system engineer|systems administrator|system administrator|linux engineer|windows engineer|infrastructure systems|telecommunications engineer)/i],
  ['hardware','Hardware, semiconductor and embedded systems',/(hardware engineer|semiconductor|silicon engineer|asic|fpga|firmware|embedded (?:software )?engineer|chip design|physical design engineer|verification engineer|validation engineer|computer architecture)/i],
  ['electrical','Electrical and electronics engineering',/(electrical engineer|electronics engineer|power systems engineer|controls engineer|rf engineer|signal integrity|mixed signal|analog design)/i],
  ['mechanical','Mechanical, manufacturing and robotics',/(mechanical engineer|manufacturing engineer|industrial engineer|robotics engineer|mechatronics|automation engineer|process engineer|thermal engineer|aerospace engineer)/i],
  ['civil','Civil, structural and construction engineering',/(civil engineer|structural engineer|geotechnical engineer|transportation engineer|construction engineer|water resources engineer|environmental engineer)/i],
  ['biotech','Biotechnology and life sciences',/(bioinformatics|computational biology|biostatistician|biomedical engineer|biotechnology|clinical data scientist|genomics|proteomics|life science informatics|scientist.*(?:biology|chemistry|pharma))/i],
  ['health-tech','Healthcare technology and clinical informatics',/(clinical informatics|health informatics|healthcare data|medical software|clinical systems|epic analyst|cerner analyst|health technology|digital health)/i],
  ['quant-fintech','Quantitative finance and fintech',/(quantitative (?:analyst|researcher|developer|engineer)|quant developer|algorithmic trading|financial engineer|risk model|pricing model|fintech engineer|payments engineer)/i],
  ['data-engineering','Data engineering',/(data\s+(?:platform\s+|warehouse\s+|infrastructure\s+|pipeline\s+)?engineer|data architect|etl\s+(?:engineer|developer)|analytics engineer)/i],
  ['database','Database engineering',/(database engineer|database administrator|\bdba\b|data warehouse architect|snowflake engineer|oracle database|postgres(?:ql)? engineer)/i],
  ['data-science','Data science and analytics',/(data scientist|decision scientist|product scientist|business intelligence|bi engineer|data analyst|product analyst|quantitative analyst|insights? analyst|analytics? (?:engineer|manager|consultant))/i],
  ['frontend','Frontend and web engineering',/(front[\s-]?end\s+(?:software\s+)?(?:engineer|developer)|(?:software\s+)?engineer[,\s-]+front[\s-]?end|ui engineer|react (?:engineer|developer)|web application engineer|web developer)/i],
  ['mobile','Mobile engineering',/(mobile (?:software )?(?:engineer|developer)|ios (?:engineer|developer)|android (?:engineer|developer)|react native (?:engineer|developer))/i],
  ['java','Java and JVM engineering',/(?:^|\b)(?:senior\s+|staff\s+|principal\s+|lead\s+)?java\s+(?:software\s+)?(?:engineer|developer)\b|jvm engineer|kotlin backend|scala engineer/i],
  ['qa-automation','Quality and test automation',/(quality (?:assurance|engineer)|qa engineer|test automation|software development engineer in test|\bsdet\b|performance test engineer|automation test engineer)/i],
  ['product-program','Technical product and program management',/(technical product manager|product manager.*(?:platform|developer|data|ai|cloud|security|infrastructure)|technical program manager|engineering program manager|tpm\b)/i],
  ['solutions','Solutions, sales and customer engineering',/(solutions? engineer|solutions? architect|sales engineer|customer engineer|partner engineer|support engineer|technical account manager|implementation engineer|forward deployed engineer)/i],
  ['ux-design','UX, product and technical design',/(product designer|ux designer|user experience designer|interaction designer|design systems|ux researcher|technical designer)/i],
  ['technical-writing','Technical writing and developer education',/(technical writer|developer advocate|developer relations|devrel|technical curriculum|developer educator|documentation engineer)/i],
  ['software','Software engineering',/(software\s+(?:development\s+)?engineer|software developer|full[\s-]?stack\s+(?:engineer|developer)|back[\s-]?end\s+(?:engineer|developer)|application\s+(?:engineer|developer)|platform\s+(?:software\s+)?engineer|distributed systems engineer)/i]
];

const nonTechnicalPattern = /(facilities maintenance|building maintenance|stationary engineer|locomotive engineer|audio engineer|broadcast engineer|chief engineer.*hotel)/i;
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
  return [/\bjava(?:\s+(?:8|11|17|21))?\b/i,/\bspring(?:\s+boot)?\b/i,/\bjvm\b/i,/\bhibernate\b/i,/\b(?:maven|gradle)\b/i]
    .reduce((count, pattern) => count + Number(pattern.test(content)), 0);
}

export function classifyRole(job) {
  const title = cleanText(job?.title);
  const content = cleanText(job?.content);
  if (!title || nonTechnicalPattern.test(title)) return null;
  for (const [code,label,pattern] of rolePatterns) if (pattern.test(title)) return { code, label };
  if (/(software|application|platform|backend|full[\s-]?stack)\s+(?:engineer|developer)/i.test(title) && javaSignalCount(content) >= 2) return { code:'java', label:'Java and JVM engineering' };
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
