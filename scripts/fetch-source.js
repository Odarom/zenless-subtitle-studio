// Public source research helper. Never reads credentials; only saves under .tools/sources.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const allowed = new Set(['zzz.nanoka.cc', 'static.nanoka.cc', 'zzz.honeyhunterworld.com']);
mkdirSync('.tools/sources', { recursive: true });
for (const raw of process.argv.slice(2)) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !allowed.has(url.hostname)) throw new Error('Source host not allowed');
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), redirect: 'error' });
  if (!response.ok) { console.log(`${url} HTTP ${response.status}`); continue; }
  const content = await response.text();
  const path = `.tools/sources/${createHash('sha256').update(url.href).digest('hex').slice(0, 16)}.txt`;
  writeFileSync(path, content);
  writeFileSync(`${path}.url`, url.href);
  console.log(`${url.href} => ${path} (${content.length} chars)`);
}
