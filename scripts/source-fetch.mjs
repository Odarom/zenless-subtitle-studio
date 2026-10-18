import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

export async function sourceText(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://static.nanoka.cc' || !parsed.pathname.endsWith('.json') || parsed.search || parsed.hash) throw new Error('Invalid glossary source URL');
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 8 * 1024 * 1024) throw new Error('Source exceeds size limit');
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf8'); JSON.parse(text);
      return text;
    } catch (error) {
      last = error;
      if (attempt < 2) console.log(`공개 자료 연결 재시도 ${attempt + 1}/2: ${parsed.pathname}`);
    }
  }
  throw new Error(`Source fetch failed: ${parsed.pathname} (${last.cause?.code ?? last.name})`);
}
