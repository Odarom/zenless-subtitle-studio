import { existsSync, copyFileSync, mkdirSync, renameSync, unlinkSync, lstatSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { readJson, saveJson } from './state.mjs';
import { validateRelease } from './program-updates.mjs';
import { sha256File } from './downloads.mjs';

export async function applyPreparedUpdate(root, { copy = copyFileSync } = {}) {
  const dataDir = join(root, 'data/video'), path = join(dataDir, 'program-update-pending.json'), pending = readJson(path, null);
  if (!pending) throw new Error('준비된 프로그램 업데이트가 없습니다.');
  const source = resolve(root, pending.staging), base = resolve(root, '.tools/program-updates');
  if (!source.startsWith(base + '\\') && !source.startsWith(base + '/')) throw new Error('업데이트 준비 경로가 올바르지 않습니다.');
  const manifest = await validateRelease(source, pending.version), destination = resolve(root, '..');
  const backup = join(dirname(dirname(source)), 'backup'); mkdirSync(backup, { recursive: true });
  const changed = [];
  try {
    for (const file of manifest.files.filter(f => !f.path.startsWith('runtime/'))) {
      const target = resolve(destination, file.path), previous = join(backup, file.path), existed = existsSync(target);
      for (let check = target; check && check !== dirname(destination); check = dirname(check)) if (existsSync(check) && lstatSync(check).isSymbolicLink()) throw new Error('설치 대상 경로에 연결이 포함되어 있습니다.');
      if (existed) { mkdirSync(dirname(previous), { recursive: true }); copyFileSync(target, previous); }
      changed.push({ target, previous, existed }); mkdirSync(dirname(target), { recursive: true });
      copy(join(source, file.path), `${target}.update-tmp`); renameSync(`${target}.update-tmp`, target);
    }
    const manifestPath = join(destination, 'release-manifest.json'), previousManifest = readJson(manifestPath, null), existed = existsSync(manifestPath), previous = join(backup, 'release-manifest.json');
    if (existed) copyFileSync(manifestPath, previous);
    changed.push({ target: manifestPath, previous, existed });
    const installed = { ...manifest, node: previousManifest?.node || { version: process.version }, installedRuntimePreserved: true, files: await Promise.all(manifest.files.map(async file => file.path.startsWith('runtime/') ? { ...file, sha256: await sha256File(join(destination, file.path)) } : file)) };
    saveJson(manifestPath, installed);
    saveJson(join(dataDir, 'program-update-receipt.json'), { version: pending.version, installedAt: new Date().toISOString(), files: changed.length, backup: relative(root, backup) });
    unlinkSync(path); return pending.version;
  } catch (error) {
    for (const file of changed.reverse()) {
      if (file.existed) copyFileSync(file.previous, file.target);
      else if (existsSync(file.target)) unlinkSync(file.target);
      if (existsSync(`${file.target}.update-tmp`)) unlinkSync(`${file.target}.update-tmp`);
    }
    saveJson(join(dataDir, 'program-update-receipt.json'), { version: pending.version, rolledBack: true, failedAt: new Date().toISOString() });
    throw error;
  }
}
