import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { runnerInput, runnerMetadata } from './runner-broker.js';

export function runnerOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))) throw new Error('Use HTTPS for a remote bot');
  return url.origin;
}
export class RunnerClient {
  constructor(path, { fetcher = fetch } = {}) { this.path = path; this.fetcher = fetcher; }
  connection() {
    const data = JSON.parse(readFileSync(this.path, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(data.token || '')) throw new Error('Invalid runner connection');
    return { origin: runnerOrigin(data.origin), token: data.token };
  }
  async request(origin, route, body, credential) {
    const response = await this.fetcher(`${runnerOrigin(origin)}/api/runner/${route}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Runner connection failed (${response.status})`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > 65536) throw new Error('Runner response too large'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks));
  }
  async pair(origin, code, settings) {
    origin = runnerOrigin(origin);
    if (!/^[a-f0-9]{64}$/.test(code)) throw new Error('Invalid pairing code');
    const data = await this.request(origin, 'pair', { code, settings: runnerMetadata(settings) });
    if (!/^[a-f0-9]{64}$/.test(data.token || '')) throw new Error('Invalid runner connection');
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`; writeFileSync(tmp, JSON.stringify({ origin, token: data.token }), { mode: 0o600 }); renameSync(tmp, this.path);
  }
  async poll(settings) {
    const { origin, token } = this.connection();
    const data = await this.request(origin, 'poll', { settings: runnerMetadata(settings) }, token);
    if (!data.job) return null;
    if (!/^[a-f0-9]{64}$/.test(data.job.id || '')) throw new Error('Invalid runner job');
    return { id: data.job.id, input: runnerInput(data.job.input) };
  }
  async complete(id, result) {
    const { origin, token } = this.connection(); return this.request(origin, 'complete', { id, ...result }, token);
  }
}
export async function processRunnerJob(client, job, translator) {
  // A completion retry reuses this result. It must never translate a second time.
  let result;
  try { result = { output: await translator.translate(runnerInput(job.input)) }; }
  catch { result = { error: true }; }
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await client.complete(job.id, result); } catch { if (attempt) throw new Error('Could not deliver runner result; translation was not repeated'); }
  }
}
