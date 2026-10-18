import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function processLock(path) {
  mkdirSync(dirname(path), { recursive: true });
  try {
    const pid = Number(readFileSync(path, 'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid process lock');
    try { process.kill(pid, 0); throw new Error('Runner already running'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    unlinkSync(path);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  writeFileSync(path, String(process.pid), { flag: 'wx', mode: 0o600 });
  process.once('exit', () => { try { if (readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path); } catch {} });
}
