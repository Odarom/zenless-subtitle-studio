import { mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'video', 'extension'), output = join(root, 'dist', 'video-extension');
mkdirSync(output, { recursive: true });
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('확장 프로그램 Manifest 버전을 확인하세요.');
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const input = join(from, entry.name), destination = join(to, entry.name);
    if (entry.isDirectory()) { copyTree(input, destination); continue; }
    if (/\.(?:m?js)$/.test(entry.name)) { const result = spawnSync(process.execPath, ['--check', input], { encoding: 'utf8' }); if (result.status) throw new Error(result.stderr); }
    copyFileSync(input, destination);
  }
}
copyTree(source, output);
copyFileSync(join(root, 'video', 'subtitles.mjs'), join(output, 'subtitles.mjs'));
for (const file of ['i18n.mjs', 'locales.mjs']) copyFileSync(join(root, 'video', 'public', file), join(output, file));
const geometry = readFileSync(join(root, 'video', 'geometry.mjs'), 'utf8');
copyFileSync(join(root, 'video', 'geometry.mjs'), join(output, 'geometry.mjs'));
writeFileSync(join(output, 'geometry.js'), `(() => { ${geometry.replace(/^export /gm, '')}\nglobalThis.__zzzGeometry = { validRegion, videoContentRect, cueRegionAt, buildCueIndex, activeCuesAt }; })();\n`);
console.log(`확장 프로그램 빌드 완료: ${output}`);
