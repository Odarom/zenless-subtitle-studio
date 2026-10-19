import { lstatSync, realpathSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export const UPLOAD_EXTENSIONS = new Set(['.srt', '.vtt', '.mp4', '.mkv', '.webm', '.mov', '.m4v', '.avi', '.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus']);
const managedName = /^([a-f0-9-]{36})\.(?:srt|vtt|mp4|mkv|webm|mov|m4v|avi|mp3|wav|m4a|aac|flac|ogg|opus|json)(?:\.tmp)?$/;
const pathError = () => new Error('영상 사본 정리 경로를 확인하지 못했습니다. 파일을 삭제하지 않았습니다.');

// Only inspect app-owned UUID filenames directly inside uploads. In particular,
// never use the original filename or the path supplied by an upload's metadata.
export function unusedUploadFiles(dataDir, referencedIds, onlyId) {
  const directory = resolve(dataDir, 'uploads'), info = lstatSync(directory, { throwIfNoEntry: false });
  if (!info) return [];
  if (info.isSymbolicLink() || !info.isDirectory() || relative(realpathSync(dataDir), realpathSync(directory)) !== 'uploads') throw pathError();
  const files = [];
  for (const name of readdirSync(directory)) {
    const match = managedName.exec(name);
    if (!match || referencedIds.has(match[1]) || onlyId !== undefined && match[1] !== onlyId) continue;
    const path = resolve(directory, name), stat = lstatSync(path);
    if (relative(directory, path) !== name || !stat.isFile() || stat.isSymbolicLink() || relative(realpathSync(directory), realpathSync(path)) !== name) throw pathError();
    files.push({ path, bytes: stat.size });
  }
  // Keep metadata until the media is removed, so a failed deletion can be retried.
  return files.sort((a, b) => Number(/\.json(?:\.tmp)?$/.test(a.path)) - Number(/\.json(?:\.tmp)?$/.test(b.path)));
}

export function removeUploadFiles(files, { bestEffort = false } = {}) {
  const result = { removedFiles: 0, removedBytes: 0, failedFiles: 0 };
  for (const file of files) {
    try { unlinkSync(file.path); result.removedFiles++; result.removedBytes += file.bytes; }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      if (!bestEffort) throw new Error('영상 사본을 정리하지 못했습니다. 파일을 사용하는 프로그램을 닫은 뒤 기록을 다시 삭제하세요.');
      result.failedFiles++;
    }
  }
  return result;
}
