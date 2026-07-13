import { readFile, writeFile } from 'node:fs/promises';

const verdictPath = 'jobs/verdict-tracking.mjs';
let verdict = await readFile(verdictPath, 'utf8');
verdict = verdict.replace("replace(//$/,'')", "replace(/\\/$/,'')");
await writeFile(verdictPath, verdict);

const workerPath = 'workers/reactions/src/index.js';
let worker = await readFile(workerPath, 'utf8');
if (!worker.includes("pathname === '/api/jobs/verdicts/batch'")) {
  const oldBlock = `    const route = parseRoute(url.pathname);\n    if (!route) {\n      return json(request, { error: \"Invalid reaction route\" }, 404);\n    }\n`;
  const newBlock = `    const pathname = url.pathname;\n    if (request.method === 'POST' && pathname === '/api/jobs/verdicts/batch') {\n      return await handleJobVerdictBatch(request, env);\n    }\n    if (request.method === 'GET' && pathname === '/api/jobs/follow-up') {\n      return await handleJobFollowUp(request, env);\n    }\n    const jobMatch = pathname.match(/^\\/api\\/jobs\\/([^/]+)\\/verdict$/);\n    if (request.method === 'POST' && jobMatch) {\n      const jobKey = decodeURIComponent(jobMatch[1]);\n      if (!validJobKey(jobKey)) return json(request, { error: 'Invalid job key' }, 400);\n      return await handleJobVerdict(request, env, jobKey);\n    }\n\n    const route = parseRoute(pathname);\n    if (!route) {\n      return json(request, { error: \"Invalid reaction route\" }, 404);\n    }\n`;
  if (!worker.includes(oldBlock)) throw new Error('Worker route insertion point not found');
  worker = worker.replace(oldBlock, newBlock);
}
await writeFile(workerPath, worker);
