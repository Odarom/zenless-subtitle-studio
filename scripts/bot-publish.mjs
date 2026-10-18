import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const BOT_REPOSITORY = 'Odarom/zenless-discord-translator';
export function botSource(root) {
  const files = new Map(), add = (path, source = path) => files.set(path, readFileSync(join(root, source), 'utf8'));
  for (const dir of ['src', 'test']) for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('공개 소스 경로에 링크가 있습니다.');
    if (entry.isFile() && entry.name.endsWith('.js')) add(`${dir}/${entry.name}`);
  }
  for (const name of ['check.js', 'reports-cli.mjs', 'local-ai.js', 'download-ollama.js', 'set-provider.js', 'build-glossary.js', 'fetch-source.js', 'source-fetch.mjs', 'sync-glossary.mjs']) add(`scripts/${name}`);
  for (const name of ['zzz.json', 'sources.json', 'community.json', 'curated.json', 'reviewed-mechanics.json', 'README.md', 'ABBREVIATIONS.md', 'LIFECYCLE.md']) add(`glossary/${name}`);
  for (const name of ['package.json', 'package-lock.json', '.env.example', 'run.cmd', 'local-ai.cmd', 'choose-ai.cmd', 'glossary-sync.cmd', 'SERVER-API.md']) add(name);
  const pkg = JSON.parse(files.get('package.json'));
  for (const key of Object.keys(pkg.scripts)) if (key.startsWith('video') || key === 'glossary:publish' || key === 'reports') delete pkg.scripts[key];
  pkg.scripts.reports = 'node scripts/reports-cli.mjs';
  files.set('package.json', JSON.stringify(pkg, null, 2) + '\n');
  files.set('.env.example', files.get('.env.example').replace('GEMINI_MODEL=gemini-3-flash-preview', 'GEMINI_MODEL=gemini-3.1-flash-lite'));
  files.set('run.cmd', files.get('run.cmd').replace('Discord 연결 정보 3개', 'Discord 연결 정보 2개').replace('choose-ai.cmd에서 번역 방식을 선택하세요.', '번역 API는 Discord에서 /zzz api-set으로 등록할 수 있습니다.'));
  for (const locale of ['ko', 'en', 'ja', 'zh-CN']) add(`README-${locale}.md`, `docs/discord/README-${locale}.md`);
  for (const name of ['TERMS.md', 'PRIVACY.md']) add(name, `docs/discord/${name}`);
  files.set('README.md', files.get('README-ko.md'));
  files.set('.gitignore', '.env\n.env.*\n!.env.example\n.secrets/\ndata/\nreports/\n.tools/\n.models/\nnode_modules/\ndist/\nglossary/cache/\nglossary/history/\nglossary/candidates/\nglossary/updates/\n');
  files.set('HOSTING.md', '# Running continuously\n\nUse a PC or server that stays online and keeps local files between restarts. Install Node.js 24.17+ and run the setup in README. Hosting and translation quotas are separate; no specific provider or free hosting plan is required.\n\nOn Linux, use a process manager such as systemd. Adapt `deploy/zenless-discord.service.example` to your user, project directory and absolute Node executable path (check with `command -v node`). Install it as a system service only after reviewing those fields. Keep the working directory at the project root. Never run the same bot token in two instances.\n\nFor migration, stop the old instance and privately transfer `.env`, `data/` and `.secrets/` together. Do not transfer `data/bot.lock` or `node_modules`; run `npm ci --ignore-scripts` on the destination. Test settings decryption and Discord connection before ending the migration. Code publication does not deploy or restart any existing server.\n\nThe bot connects outward to Discord. A public inbound HTTP port is not needed for the bot itself. The maintainer’s optional video-report service is separate.\n');
  files.set('deploy/zenless-discord.service.example', '[Unit]\nDescription=Zenless Discord Translator\nAfter=network-online.target\nWants=network-online.target\nStartLimitIntervalSec=60\nStartLimitBurst=5\n\n[Service]\nType=simple\nUser=CHANGE_TO_YOUR_SERVICE_USER\nWorkingDirectory=/srv/zenless-discord-translator\nExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env /srv/zenless-discord-translator/src/index.js\nRestart=on-failure\nRestartSec=10\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\n\n[Install]\nWantedBy=multi-user.target\n');
  for (const path of files.keys()) if (path !== '.env.example' && /(?:^|\/)(?:\.env[^/]*|\.secrets|data|reports|\.tools|\.models|node_modules)(?:\/|$)/i.test(path)) throw new Error('공개 목록에 개인 자료가 있습니다.');
  return files;
}
export function stageBot(root = resolve(import.meta.dirname, '..')) {
  mkdirSync(join(root, '.tools/video-package'), { recursive: true });
  const path = mkdtempSync(join(root, '.tools/video-package/bot-source-')), files = botSource(root);
  for (const [name, text] of files) { mkdirSync(dirname(join(path, name)), { recursive: true }); writeFileSync(join(path, name), text); }
  writeFileSync(join(root, '.tools/video-package/bot-source-latest.json'), JSON.stringify({ path, files: [...files.keys()] }, null, 2));
  return { path, files: files.size };
}
export function publishBot(root = resolve(import.meta.dirname, '..')) {
  const files = botSource(root), repo = BOT_REPOSITORY, temporary = join(root, '.tools/video-package/bot-publish'); mkdirSync(temporary, { recursive: true });
  const executable = process.env.ZZZ_GH_BIN || join(root, '.tools/github-cli/bin/gh.exe'); let sequence = 0;
  const api = (path, method = 'GET', body) => {
    const args = ['api', path, '--method', method];
    if (body !== undefined) { const file = join(temporary, `${++sequence}.json`); writeFileSync(file, JSON.stringify(body)); args.push('--input', file); }
    const r = spawnSync(executable, args, { shell: false, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1048576 });
    if (r.error || r.status) throw new Error(r.stderr?.trim() || r.error?.message || 'GitHub 게시 실패');
    return r.stdout.trim() ? JSON.parse(r.stdout) : null;
  };
  if (api('user').login.toLowerCase() !== repo.split('/')[0].toLowerCase()) throw new Error('GitHub 게시 계정이 다릅니다.');
  let remote;
  try { remote = api(`repos/${repo}`); } catch (error) { if (!/HTTP 404/.test(error.message)) throw error; remote = api('user/repos', 'POST', { name: repo.split('/')[1], private: false, auto_init: true, has_issues: true, description: 'Self-hosted Zenless Zone Zero Discord translator with per-server API keys, a four-language glossary and private feedback. Setup guides in ko/en/ja/zh-CN.' }); }
  if (remote.private || remote.default_branch !== 'main') throw new Error('공개 main 저장소를 확인하세요. 공개 범위는 바꾸지 않았습니다.');
  const head = api(`repos/${repo}/git/ref/heads/main`).object.sha, base = api(`repos/${repo}/git/commits/${head}`);
  const tree = api(`repos/${repo}/git/trees`, 'POST', { base_tree: base.tree.sha, tree: [...files].map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) });
  let commit = head;
  if (tree.sha !== base.tree.sha) {
    commit = api(`repos/${repo}/git/commits`, 'POST', { message: 'Publish Discord translator source and four-language setup guides', tree: tree.sha, parents: [head] }).sha;
    api(`repos/${repo}/git/refs/heads/main`, 'PATCH', { sha: commit, force: false });
  }
  const result = { repository: repo, url: remote.html_url, readme: `${remote.html_url}/blob/main/README-ko.md`, files: files.size, commit };
  writeFileSync(join(root, 'dist/bot-published.json'), JSON.stringify(result, null, 2)); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(process.argv.includes('--stage-only') ? stageBot() : publishBot(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
