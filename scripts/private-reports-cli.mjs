import { PrivateReportStore } from '../services/private-reports.mjs';
import { resolve } from 'node:path';
let store;
try {
  store = new PrivateReportStore(resolve('data/private-video-reports.sqlite'));
  const action = process.argv[2];
  if (action === 'export') {
    const offset = Number(process.argv[3] || 0);
    console.log(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), reports: store.list({ offset }) }));
  } else if (action === 'apply') {
    let input = ''; for await (const part of process.stdin) { input += part; if (input.length > 256 * 1024) throw new Error('Input too large'); }
    const data = JSON.parse(input); if (data.version !== 1) throw new Error('Invalid decisions');
    console.log(JSON.stringify(store.apply(data.decisions)));
  } else throw new Error('Use export or apply');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { store?.close(); }
