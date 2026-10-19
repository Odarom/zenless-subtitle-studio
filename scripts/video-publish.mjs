import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { VIDEO_VERSION } from '../video/version.mjs';
import { DEFAULT_PROGRAM_REPOSITORY } from '../video/distribution.mjs';
import { sha256File } from '../video/downloads.mjs';

// Public source is built from this explicit allowlist, never from the checkout
// or from a used portable installation. No user data or model files are read.
export function publicSource(root) {
  const result = new Map();
  const add = (path, from = path) => result.set(path, readFileSync(join(root, from), 'utf8'));
  const walk = directory => {
    for (const item of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${item.name}`;
      if (item.isSymbolicLink() || item.name.startsWith('.')) throw new Error(`공개 소스 경로를 확인하세요: ${path}`);
      if (item.isDirectory()) walk(path);
      else if (/\.(?:m?js|json|html|css|svg|md)$/.test(item.name)) add(path);
    }
  };
  for (const dir of ['video', 'src', 'scripts', 'services', 'test', 'runner']) walk(dir);
  if (existsSync(join(root, 'docs/discord'))) walk('docs/discord');
  for (const name of ['zzz.json', 'sources.json', 'community.json', 'curated.json', 'reviewed-mechanics.json', 'localizations.json', 'README.md', 'ABBREVIATIONS.md', 'LIFECYCLE.md', 'classification.json', 'TAGS.md']) add(`glossary/${name}`);
  for (const name of ['config.yml', 'glossary-ko.yml', 'glossary-en.yml', 'glossary-ja.yml', 'glossary-zh-CN.yml']) add(`glossary/issue-templates/${name}`);
  for (const name of ['package.json', 'package-lock.json', 'video-run.cmd', 'video-setup.cmd', 'run.cmd', 'runner.cmd', 'local-ai.cmd', 'choose-ai.cmd', 'glossary-sync.cmd', 'reports.cmd', 'REPORTS.md', 'SERVER-API.md', 'VIDEO-SUBTITLES.md', '.env.example', '.env.runner.example']) if (existsSync(join(root, name))) add(name);
  for (const locale of ['ko', 'en', 'ja', 'zh-CN']) add(`README-${locale}.md`, `video/docs/README-${locale}.md`);
  add('README.md', 'video/docs/README.md');
  add('DEVELOPMENT.md', 'video/docs/DEVELOPMENT.md');
  add('THIRD-PARTY-NOTICES.md', 'video/docs/THIRD-PARTY-NOTICES.md');
  result.set('.gitignore', '.env\n.env.*\n!.env.example\n!.env.runner.example\n.secrets/\n.tools/\n.models/\nnode_modules/\ndata/\nreports/\ndist/\nglossary/cache/\nglossary/history/\nglossary/candidates/\nglossary/updates/\n');
  for (const path of result.keys()) if (/(?:^|\/)(?:\.secrets|data|reports|node_modules|\.tools|\.models)(?:\/|$)/i.test(path) || path === '.env') throw new Error('공개 목록에 개인 자료가 포함되었습니다.');
  return result;
}

export async function publishProgram(root = resolve(import.meta.dirname, '..'), { sourceOnly = false } = {}) {
  const repo = DEFAULT_PROGRAM_REPOSITORY, owner = repo.split('/')[0];
  const executable = process.env.ZZZ_GH_BIN || join(root, '.tools/github-cli/bin/gh.exe');
  const temporary = join(root, '.tools/video-package/program-publish'); mkdirSync(temporary, { recursive: true });
  let sequence = 0;
  const gh = args => {
    const r = spawnSync(executable, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 240000, maxBuffer: 16 * 1048576 });
    if (r.error || r.status) throw new Error(r.stderr?.trim() || r.error?.message || 'GitHub 게시 실패');
    return r.stdout.trim();
  };
  const api = (path, method = 'GET', body) => {
    const args = ['api', path, '--method', method];
    if (body !== undefined) { const file = join(temporary, `${++sequence}.json`); writeFileSync(file, JSON.stringify(body)); args.push('--input', file); }
    const value = gh(args); return value ? JSON.parse(value) : null;
  };
  const account = api('user');
  if (account.login.toLowerCase() !== owner.toLowerCase()) throw new Error('GitHub 로그인 계정과 게시 대상이 다릅니다.');
  let remote;
  try { remote = api(`repos/${repo}`); }
  catch (error) { if (!/HTTP 404/.test(error.message)) throw error; remote = api('user/repos', 'POST', { name: repo.split('/')[1], private: false, auto_init: true, has_issues: true, description: 'Local video subtitles and optional positioned OCR translation with a shared Zenless glossary. Windows app and YouTube extension.' }); }
  if (remote.private || remote.default_branch !== 'main') throw new Error('공개 main 저장소인지 확인하세요. 기존 저장소의 공개 범위는 바꾸지 않았습니다.');
  const commitFiles = (files, message) => {
    const head = api(`repos/${repo}/git/ref/heads/main`).object.sha, base = api(`repos/${repo}/git/commits/${head}`);
    const tree = api(`repos/${repo}/git/trees`, 'POST', { base_tree: base.tree.sha, tree: [...files].map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) });
    if (tree.sha === base.tree.sha) return head;
    const commit = api(`repos/${repo}/git/commits`, 'POST', { message, tree: tree.sha, parents: [head] });
    api(`repos/${repo}/git/refs/heads/main`, 'PATCH', { sha: commit.sha, force: false }); return commit.sha;
  };
  const files = publicSource(root), servicePath = join(root, 'dist/report-service.json');
  if (existsSync(servicePath)) {
    const service = JSON.parse(readFileSync(servicePath, 'utf8'));
    const url = new URL(service.reports);
    if (url.protocol !== 'https:' || url.pathname !== '/api/reports' || url.username || url.password) throw new Error('신고 서버 공개 설정이 올바르지 않습니다.');
    const health = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(20000) });
    if (!health.ok || !(await health.json()).ready) throw new Error('외부 HTTPS 신고 서버를 확인하지 못했습니다.');
    files.set('services.json', JSON.stringify({ schema: 1, reports: url.href }, null, 2) + '\n');
  }

  let commit = commitFiles(files, `Update subtitle studio ${VIDEO_VERSION}`);
  if (sourceOnly) return { repository: repo, url: remote.html_url, commit, sourceFiles: files.size };
  const release = JSON.parse(readFileSync(join(root, 'dist/video-release.json'), 'utf8'));
  if (release.version !== VIDEO_VERSION || await sha256File(release.output) !== release.sha256) throw new Error('배포 ZIP 버전 또는 체크섬을 확인하세요.');
  const qa = JSON.parse(readFileSync(join(root, 'dist/video-package-qa.json'), 'utf8'));
  if (qa.version !== VIDEO_VERSION || qa.archiveSha256 !== release.sha256 || !qa.cpuTranscription || !qa.optionalCpuOcr) throw new Error('최종 배포본 검사를 먼저 완료하세요.');
  if (!qa.jobDeletionRemovesMediaAndUploadCopies || !qa.separateVideoDownload || !qa.separateOriginalsAndDownloadsPreserved) throw new Error('최종 배포본의 파일 정리·영상 저장 검사를 먼저 완료하세요.');
  const updateQa = JSON.parse(readFileSync(join(root, 'dist/video-update-qa.json'), 'utf8'));
  if (updateQa.version !== VIDEO_VERSION || updateQa.archiveSha256 !== release.sha256 || !updateQa.bundledSupervisorRestart || !updateQa.settingsKeysModelsToolsHistoryPreserved) throw new Error('최종 배포본의 업데이트·재시작 검사를 먼저 완료하세요.');
  if (!updateQa.legacyOrphanUploadsRemoved || !updateQa.referencedUploadsPreserved || !updateQa.separateOriginalsAndDownloadsPreserved) throw new Error('업데이트 후 이전 잔여 파일 정리·작업 파일 보존 검사를 먼저 완료하세요.');
  const tag = `v${VIDEO_VERSION}`; let published;
  try { published = api(`repos/${repo}/releases/tags/${tag}`); } catch (error) { if (!/HTTP 404/.test(error.message)) throw error; }
  if (published) {
    const asset = published.assets.find(a => a.name === release.output.split(/[\\/]/).at(-1));
    if (!asset || asset.digest !== `sha256:${release.sha256}` || published.draft) throw new Error('같은 버전의 다른 배포 파일을 덮어쓰지 않습니다. 새 버전을 사용하세요.');
  } else {
    const notes = join(temporary, 'release-notes.md');
    const releaseNotes = readFileSync(join(root, 'video/docs/RELEASE-NOTES.md'), 'utf8')
      .replace(/\]\((README(?:-(?:ko|en|ja|zh-CN))?\.md)(#[^)]*)?\)/g, (_, file, anchor = '') => `](https://github.com/${repo}/blob/main/${file}${anchor})`);
    writeFileSync(notes, releaseNotes + '\nSHA-256: ' + release.sha256 + '\n');
    gh(['release', 'create', tag, release.output, `${release.output}.sha256`, '--repo', repo, '--target', commit, '--title', `ZZZ Subtitle Studio ${VIDEO_VERSION}`, '--notes-file', notes, '--draft']);
    gh(['release', 'edit', tag, '--repo', repo, '--draft=false', '--latest']);
    published = api(`repos/${repo}/releases/tags/${tag}`);
  }
  const feed = { schema: 1, app: 'zenless-subtitle-studio', version: VIDEO_VERSION, platform: 'win32-x64', minimumNode: '24.17.0', bytes: statSync(release.output).size, sha256: release.sha256, url: `https://github.com/${repo}/releases/download/${tag}/zenless-subtitle-studio-${VIDEO_VERSION}-win-x64.zip` };
  if (!published.assets.some(a => a.browser_download_url === feed.url && a.digest === `sha256:${feed.sha256}`)) throw new Error('게시한 배포 파일의 무결성을 확인하지 못했습니다.');
  commit = commitFiles(new Map([['program-latest.json', JSON.stringify(feed, null, 2) + '\n']]), `Publish program update feed ${VIDEO_VERSION}`);
  const result = { repository: repo, url: remote.html_url, releaseUrl: published.html_url, downloadUrl: feed.url, version: VIDEO_VERSION, sha256: feed.sha256, bytes: feed.bytes, commit };
  writeFileSync(join(root, 'dist/program-published.json'), JSON.stringify(result, null, 2)); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await publishProgram(undefined, { sourceOnly: process.argv.includes('--source-only') }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
