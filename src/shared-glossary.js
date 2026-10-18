import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { loadGlossary } from './translator.js';

export const SHARED_GLOSSARY_BASE = 'https://raw.githubusercontent.com/Odarom/zenless-translation-database/main/';
async function download(fetcher, url, limit) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok || Number(response.headers.get('content-length')) > limit) throw new Error('Glossary download failed');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > limit) throw new Error('Glossary download too large'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export async function updateSharedGlossary(path, { fetcher = fetch } = {}) {
  const feed = JSON.parse(await download(fetcher, `${SHARED_GLOSSARY_BASE}latest.json`, 16384));
  if (feed.schema !== 1 || !/^[a-f0-9]{64}$/.test(feed.sha256 || '') || feed.file !== `releases/${feed.sha256}.json`
    || !Number.isSafeInteger(feed.bytes) || feed.bytes < 1 || feed.bytes > 16 * 1048576 || !Number.isSafeInteger(feed.count) || feed.count < 1) throw new Error('Invalid shared glossary feed');
  const hash = value => createHash('sha256').update(value).digest('hex');
  if (existsSync(path) && hash(readFileSync(path)) === feed.sha256) return { updated: false, hash: feed.sha256 };
  const bytes = await download(fetcher, `${SHARED_GLOSSARY_BASE}${feed.file}`, 16 * 1048576);
  if (bytes.length !== feed.bytes || hash(bytes) !== feed.sha256) throw new Error('Shared glossary checksum mismatch');
  mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    if (loadGlossary(temporary).length !== feed.count) throw new Error('Shared glossary entry count mismatch');
    renameSync(temporary, path);
  } finally { if (existsSync(temporary)) unlinkSync(temporary); }
  return { updated: true, hash: feed.sha256 };
}
