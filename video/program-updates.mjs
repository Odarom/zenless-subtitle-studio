import { existsSync, mkdirSync, mkdtempSync, readFileSync, lstatSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { zipOperation, sha256File } from './downloads.mjs';
import { saveJson, readJson } from './state.mjs';
import { VIDEO_VERSION } from './version.mjs';
import { DEFAULT_PROGRAM_REPOSITORY } from './distribution.mjs';

export const UPDATE_EXIT_CODE = 75;
export const versionParts = version => /^\d+\.\d+\.\d+$/.test(version || '') ? version.split('.').map(Number) : null;
export function newerVersion(candidate, current) {
  const a = versionParts(candidate), b = versionParts(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export function updatePathAllowed(path) {
  if (typeof path !== 'string' || path.includes('\\') || path.includes(':') || path.startsWith('/') || path.split('/').some(p => !p || p === '..' || p.startsWith('.'))) return false;
  if (path.split('/').some(p => ['data', 'reports', 'node_modules'].includes(p.toLowerCase()))) return false;
  return /^(?:app\/(?:video\/|src\/|glossary\/(?:zzz\.json|sources\.json|README\.md)$|scripts\/video-(?:launch|setup|update-apply)\.mjs$|package\.json$)|video-extension\/|runtime\/(?:node\.exe|LICENSE-Node\.txt)$|README(?:-(?:ko|en|ja|zh-CN))?\.md$|Start\.cmd$|Setup\.cmd$|THIRD-PARTY-NOTICES\.md$)/.test(path);
}
function filesIn(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('업데이트 파일에 경로 연결이 포함되어 있습니다.');
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? filesIn(root, path) : [path];
  });
}
export async function validateRelease(folder, version) {
  const manifest = readJson(join(folder, 'release-manifest.json'), null);
  if (manifest?.version !== version || manifest.platform !== 'win32-x64' || !Array.isArray(manifest.files) || manifest.files.length > 2000) throw new Error('프로그램 업데이트 목록을 확인하지 못했습니다.');
  const paths = new Set(); let size = 0;
  for (const file of manifest.files) {
    if (!updatePathAllowed(file.path) || paths.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256 || '')) throw new Error('프로그램 업데이트 경로가 올바르지 않습니다.');
    paths.add(file.path); const full = resolve(folder, file.path), stat = lstatSync(full);
    size += stat.size;
    if (!stat.isFile() || stat.isSymbolicLink() || size > 256 * 1048576 || await sha256File(full) !== file.sha256) throw new Error('프로그램 업데이트 파일 검증에 실패했습니다.');
  }
  if (!paths.has('app/video/server.mjs') || !paths.has('app/scripts/video-launch.mjs') || !paths.has('video-extension/manifest.json')) throw new Error('필수 프로그램 업데이트 파일이 없습니다.');
  for (const path of filesIn(folder)) if (path !== 'release-manifest.json' && !paths.has(path)) throw new Error('업데이트 목록 밖의 파일이 포함되어 있습니다.');
  return manifest;
}
export class ProgramUpdates {
  constructor({ root, dataDir, busy = () => false, fetcher = fetch, extract = zipOperation, version = VIDEO_VERSION }) {
    this.root = root; this.dataDir = dataDir; this.busy = busy; this.fetcher = fetcher; this.extract = extract; this.version = version;
    this.portable = existsSync(join(root, '..', 'runtime', 'node.exe')) && existsSync(join(root, '..', 'Start.cmd'));
    this.path = join(dataDir, 'program-updates.json'); this.state = readJson(this.path, { lastCheckedAt: null, available: null, error: null });
    this.working = false;
  }
  public() { return { currentVersion: this.version, repository: DEFAULT_PROGRAM_REPOSITORY, installSupported: this.portable, working: this.working, ...this.state }; }
  async check() {
    try {
      const response = await this.fetcher(`https://raw.githubusercontent.com/${DEFAULT_PROGRAM_REPOSITORY}/main/program-latest.json`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`업데이트 확인 실패 (HTTP ${response.status}).`);
      const bytes = await response.arrayBuffer(); if (bytes.byteLength > 32768) throw new Error('업데이트 정보가 너무 큽니다.');
      const data = JSON.parse(Buffer.from(bytes));
      const name = `zenless-subtitle-studio-${data.version}-win-x64.zip`;
      if (data.schema !== 1 || data.app !== 'zenless-subtitle-studio' || !versionParts(data.version) || data.platform !== 'win32-x64' || !/^[a-f0-9]{64}$/.test(data.sha256 || '') || !Number.isSafeInteger(data.bytes) || data.bytes < 1 || data.bytes > 256 * 1048576 || data.url !== `https://github.com/${DEFAULT_PROGRAM_REPOSITORY}/releases/download/v${data.version}/${name}`) throw new Error('프로그램 업데이트 정보가 올바르지 않습니다.');
      if (newerVersion(data.minimumNode || '24.17.0', process.versions.node)) throw new Error('새 실행 환경이 필요합니다. 최신 전체 배포본을 설치하세요.');
      this.state = { lastCheckedAt: Date.now(), available: newerVersion(data.version, this.version) ? data : null, error: null };
      saveJson(this.path, this.state); return this.public();
    } catch (error) { this.state.error = error.message; saveJson(this.path, this.state); throw error; }
  }
  async prepare() {
    if (!this.portable) throw new Error('자동 설치는 외부 배포본에서 사용할 수 있습니다. 개발 소스는 GitHub 소스로 갱신하세요.');
    if (this.working || this.busy()) throw new Error('진행 중인 작업이 끝난 뒤 프로그램을 업데이트하세요.');
    this.working = true;
    try {
      await this.check(); const release = this.state.available;
      if (!release) throw new Error('최신 프로그램을 사용 중입니다.');
      const base = join(this.root, '.tools', 'program-updates'); mkdirSync(base, { recursive: true });
      const staging = mkdtempSync(join(base, 'stage-')), archive = join(staging, 'release.zip');
      const response = await this.fetcher(release.url, { signal: AbortSignal.timeout(10 * 60000) });
      if (!response.ok) throw new Error('프로그램 업데이트를 다운로드하지 못했습니다.');
      const chunks = []; let length = 0; const hash = createHash('sha256');
      for await (const chunk of response.body) { length += chunk.length; if (length > release.bytes) throw new Error('업데이트 크기가 일치하지 않습니다.'); chunks.push(chunk); hash.update(chunk); }
      if (length !== release.bytes || hash.digest('hex') !== release.sha256) throw new Error('업데이트 체크섬이 다릅니다. 현재 프로그램을 유지합니다.');
      writeFileSync(archive, Buffer.concat(chunks));
      const extracted = join(staging, 'extracted'); await this.extract(archive, extracted, { maxExpandedBytes: 256 * 1048576 });
      const folder = join(extracted, `Zenless-Subtitle-Studio-${release.version}-win-x64`);
      const manifest = await validateRelease(folder, release.version);
      if (this.busy()) throw new Error('진행 중인 작업이 끝난 뒤 프로그램을 업데이트하세요.');
      saveJson(join(this.dataDir, 'program-update-pending.json'), { version: release.version, staging: relative(this.root, folder), files: manifest.files });
      return { version: release.version, prepared: true };
    } finally { this.working = false; }
  }
}
