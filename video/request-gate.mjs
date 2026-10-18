import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { readJson, saveJson } from './state.mjs';

export class RequestGate {
  constructor(dataDir, { now = Date.now, wait = delay } = {}) { this.path = join(dataDir, 'request-gate.json'); this.now = now; this.wait = wait; }
  async enter(config, { signal, update = () => {} } = {}) {
    if (config.provider === 'ollama') return;
    const key = createHash('sha256').update(config.provider + ':' + config.apiKey).digest('hex');
    const interval = Math.ceil(60000 / (config.requestsPerMinute || 1));
    const state = readJson(this.path, {}), next = Number(state[key] || 0) + interval;
    while (this.now() < next) {
      signal?.throwIfAborted();
      update({ stage: 'waiting-api', stageProgress: null, message: `API 요청 간격을 지키기 위해 기다리고 있습니다. ${Math.ceil((next - this.now()) / 1000)}초` });
      await this.wait(Math.min(1000, next - this.now()), undefined, { signal });
    }
    signal?.throwIfAborted();
    const latest = readJson(this.path, {}); latest[key] = this.now(); saveJson(this.path, latest);
  }
}
