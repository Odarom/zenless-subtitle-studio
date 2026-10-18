import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGlossaryRelease } from './video-glossary-build.mjs';

export function publishGlossary(root = resolve(import.meta.dirname, '..')) {
  const release = buildGlossaryRelease(root), repo = release.repository, owner = repo.split('/')[0];
  const executable = process.env.ZZZ_GH_BIN || (existsSync(join(root, '.tools', 'github-cli', 'bin', 'gh.exe')) ? join(root, '.tools', 'github-cli', 'bin', 'gh.exe') : 'gh');
  const temporary = join(root, '.tools', 'video-package', 'github-publish'); mkdirSync(temporary, { recursive: true });
  let sequence = 0;
  const api = (endpoint, method = 'GET', body) => {
    const args = ['api', endpoint, '--method', method];
    if (body !== undefined) { const path = join(temporary, `${++sequence}.json`); writeFileSync(path, JSON.stringify(body)); args.push('--input', path); }
    const result = spawnSync(executable, args, { shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1048576 });
    if (result.error || result.status !== 0) throw new Error(result.stderr?.trim() || result.error?.message || 'GitHub 게시 실패');
    return result.stdout.trim() ? JSON.parse(result.stdout) : null;
  };
  const account = api('user');
  if (account.login.toLowerCase() !== owner.toLowerCase()) throw new Error('게시할 계정과 로그인한 GitHub 계정이 다릅니다.');
  let remote;
  try { remote = api(`repos/${repo}`); }
  catch (error) { if (!/HTTP 404/.test(error.message)) throw error; remote = api('user/repos', 'POST', { name: repo.split('/')[1], description: 'Reviewed Zenless Zone Zero glossary in Korean, English, Japanese and Simplified Chinese. Shared subtitle and Discord translation feedback.', private: false, has_issues: true, auto_init: true }); }
  if (remote.private) throw new Error('용어집 업데이트는 공개 저장소가 필요합니다. 기존 저장소의 공개 범위는 변경하지 않았습니다.');
  const branch = remote.default_branch, previous = api(`repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`).object.sha;
  const base = api(`repos/${repo}/git/commits/${previous}`);
  // Only these explicitly public database files can leave the workspace.
  const paths = ['README.md', 'README-ko.md', 'README-en.md', 'README-ja.md', 'README-zh-CN.md', 'latest.json', release.manifest.file,
    ...['zzz.json', 'sources.json', 'community.json', 'curated.json', 'reviewed-mechanics.json', 'README.md', 'ABBREVIATIONS.md', 'LIFECYCLE.md'].map(file => `catalog/${file}`)];
  const tree = api(`repos/${repo}/git/trees`, 'POST', { base_tree: base.tree.sha, tree: paths.map(path => ({ path, mode: '100644', type: 'blob', content: readFileSync(join(release.output, path), 'utf8') })) });
  if (tree.sha === base.tree.sha) return { repository: repo, url: remote.html_url, version: release.manifest.version, unchanged: true };
  const commit = api(`repos/${repo}/git/commits`, 'POST', { message: `Publish reviewed glossary ${release.manifest.version}`, tree: tree.sha, parents: [previous] });
  let main;
  try { main = api(`repos/${repo}/git/ref/heads/main`); } catch (error) { if (!/HTTP 404/.test(error.message)) throw error; }
  if (main) api(`repos/${repo}/git/refs/heads/main`, 'PATCH', { sha: commit.sha, force: false });
  else api(`repos/${repo}/git/refs`, 'POST', { ref: 'refs/heads/main', sha: commit.sha });
  if (branch !== 'main') api(`repos/${repo}`, 'PATCH', { default_branch: 'main' });
  return { repository: repo, url: remote.html_url, version: release.manifest.version, count: release.manifest.count, commit: commit.sha, manifestUrl: `https://raw.githubusercontent.com/${repo}/main/latest.json` };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = publishGlossary(); writeFileSync('dist/glossary-published.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
