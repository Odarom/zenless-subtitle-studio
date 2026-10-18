import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readJson, saveJson } from './state.mjs';
import { DEFAULT_PROGRAM_REPOSITORY } from './distribution.mjs';

export class ReportDelivery {
  constructor({ dataDir, reports, fetcher = fetch }) {
    this.dataDir = dataDir; this.reports = reports; this.fetcher = fetcher; this.sending = new Set();
    const path = join(dataDir, 'report-installation.json'); this.installationId = readJson(path, null)?.id || randomUUID(); saveJson(path, { id: this.installationId });
  }
  async send(id) {
    const report = this.reports.get(id);
    if (report.delivery?.receiptId) return report.delivery;
    if (this.sending.has(id)) throw new Error('이 신고를 이미 전송하고 있습니다.');
    this.sending.add(id);
    try {
      const configResponse = await this.fetcher(`https://raw.githubusercontent.com/${DEFAULT_PROGRAM_REPOSITORY}/main/services.json`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!configResponse.ok) throw new Error('신고 접수 서버 정보를 확인하지 못했습니다. PC에 저장된 신고는 유지했습니다.');
      const config = await configResponse.json(); let endpoint;
      try { endpoint = new URL(config.reports); } catch {}
      if (config.schema !== 1 || !endpoint || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || endpoint.pathname !== '/api/reports' || endpoint.search || endpoint.hash) throw new Error('신고 서버 주소를 확인하지 못했습니다.');
      const response = await this.fetcher(endpoint.href, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installationId: this.installationId, report }) });
      if (!response.ok) throw new Error(response.status === 429 ? '신고 전송 한도에 도달했습니다. 잠시 후 다시 보내세요. PC 신고는 유지했습니다.' : '신고를 전송하지 못했습니다. PC 신고를 유지했으니 다시 전송할 수 있습니다.');
      const receipt = await response.json();
      if (!/^A-\d{8}-[a-f0-9]{12}$/.test(receipt.receiptId || '')) throw new Error('신고 접수 응답을 확인하지 못했습니다.');
      const delivery = { receiptId: receipt.receiptId, submittedAt: new Date().toISOString() };
      saveJson(join(this.reports.directory, `${report.id}.json`), { ...report, delivery }); return delivery;
    } finally { this.sending.delete(id); }
  }
}
