import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { normalizeSharedDiscordReport } from './shared-report.js';

export const PROJECT_REPORT_ENDPOINT = 'https://reports.140-238-54-74.sslip.io/api/discord-reports';
export class ReportSharing {
  constructor(path, { fetcher = fetch } = {}) {
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, JSON.stringify({ installationId: randomUUID() }), { flag: 'wx', mode: 0o600 });
    this.installationId = JSON.parse(readFileSync(path, 'utf8')).installationId;
    if (!/^[a-f0-9-]{36}$/.test(this.installationId || '')) throw new Error('Invalid report installation');
    this.fetcher = fetcher;
  }
  async send(report) {
    const payload = normalizeSharedDiscordReport({ ...report, platform: 'discord' });
    const response = await this.fetcher(PROJECT_REPORT_ENDPOINT, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ installationId: this.installationId, report: payload }),
    });
    if (!response.ok) throw new Error('Project report delivery failed');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 4096) throw new Error('Invalid project receipt');
    const data = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!/^A-\d{8}-[a-f0-9]{12}$/.test(data.receiptId || '')) throw new Error('Invalid project receipt');
    return data.receiptId;
  }
}
