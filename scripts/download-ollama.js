// Official pinned Windows runtime, verified before extraction. No credentials are read.
import { createWriteStream, createReadStream, mkdirSync, renameSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
const file = '.tools/ollama-windows.zip';
const expected = '3623e256762ca89bd6fa99b0cc4106401919ce9df926411673e632e3ea287bb5';
mkdirSync('.tools', { recursive: true });
const response = await fetch('https://github.com/ollama/ollama/releases/download/v0.40.0/ollama-windows-amd64.zip', { signal: AbortSignal.timeout(1800000) });
if (!response.ok) throw new Error(`Download HTTP ${response.status}`);
await pipeline(Readable.fromWeb(response.body), createWriteStream(`${file}.part`));
const hash = createHash('sha256');
for await (const chunk of createReadStream(`${file}.part`)) hash.update(chunk);
if (hash.digest('hex') !== expected) throw new Error('Ollama checksum mismatch; file was not installed.');
renameSync(`${file}.part`, file);
console.log('Ollama v0.40.0 downloaded and SHA-256 verified.');
