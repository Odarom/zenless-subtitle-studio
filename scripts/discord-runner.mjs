import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { settings, UserError } from '../src/config.js';
import { validateApiSettings, GuildVault } from '../src/vault.js';
import { Store } from '../src/store.js';
import { Translator, loadGlossary } from '../src/translator.js';
import { RunnerClient, processRunnerJob } from '../src/runner-client.js';
import { updateSharedGlossary } from '../src/shared-glossary.js';
import { createInterface } from 'node:readline/promises';
import { createHash } from 'node:crypto';
import { runnerText } from '../src/runner-i18n.js';
import { processLock } from '../src/process-lock.js';
const ui = key => runnerText(process.env.UI_LANGUAGE || 'ko', key);

async function main() {
  const folder = resolve(process.env.RUNNER_DATA_DIR || 'data/runner'); mkdirSync(folder, { recursive: true });
  let config = settings(process.env, { requireSecrets: false });
  // Private migration for an operator's own existing installation only.
  if (process.env.RUNNER_OWN_VAULT_GUILD) {
    if (process.env.RUNNER_OWN_VAULT_GUILD !== process.env.DISCORD_GUILD_ID) throw new UserError('본인 서버의 기존 키만 이전할 수 있습니다.');
    const vault = new GuildVault(resolve('data/guild-api.json'), resolve('.secrets/api-vault.key'));
    const saved = vault.get(process.env.RUNNER_OWN_VAULT_GUILD);
    if (!saved) throw new UserError('본인 서버의 기존 키를 찾지 못했습니다.'); config = { ...settings({ ...process.env, TRANSLATION_PROVIDER: saved.provider }, { requireSecrets: false }), ...saved };
  }
  if (config.provider !== 'ollama') validateApiSettings(config);
  const client = new RunnerClient(resolve(folder, 'connection.json')), action = process.argv[2] || 'start';
  if (action === 'pair') {
    let code = process.argv[3];
    if (!code) { const input = createInterface({ input: process.stdin, output: process.stdout }); try { code = (await input.question(ui('prompt'))).trim(); } finally { input.close(); } }
    await client.pair(process.env.RUNNER_URL || 'https://reports.140-238-54-74.sslip.io', code, config);
    console.log(ui('paired')); return;
  }
  const usage = new Store(resolve(folder, 'usage.json')).scoped('personal-runner');
  if (action === 'usage') { console.log(JSON.stringify(usage.usage(), null, 2)); return; }
  if (action !== 'start') throw new UserError('pair, start 또는 usage를 사용하세요.');
  processLock(resolve(folder, 'runner.lock'));
  client.connection();
  const shared = resolve(folder, 'glossary.json'); let glossaryPath = resolve('glossary/zzz.json');
  if (existsSync(shared)) { try { loadGlossary(shared); glossaryPath = shared; } catch {} }
  let checked = 0;
  const refresh = async () => { checked = Date.now(); try { await updateSharedGlossary(shared); glossaryPath = shared; } catch { console.warn(ui('cache')); } };
  if (process.env.SHARED_GLOSSARY_UPDATES !== 'off') await refresh();
  config.promptHash = createHash('sha256').update(readFileSync(resolve('src/translator.js'))).digest('hex');
  let stopping = false; for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopping = true; });
  console.log(ui('ready'));
  const connectionStatus = connected => { const path = resolve(folder, 'status.json'); writeFileSync(path + '.tmp', JSON.stringify({ connected, lastPollAt: Date.now() }), { mode: 0o600 }); renameSync(path + '.tmp', path); };
  while (!stopping) {
    try {
      if (process.env.SHARED_GLOSSARY_UPDATES !== 'off' && Date.now() - checked > 6 * 3600000) await refresh();
      config.glossaryHash = createHash('sha256').update(readFileSync(glossaryPath)).digest('hex');
      const job = await client.poll(config);
      connectionStatus(true);
      if (job) { await processRunnerJob(client, job, new Translator(config, usage, glossaryPath)); continue; }
    } catch { connectionStatus(false); console.warn(ui('failed')); }
    await new Promise(done => setTimeout(done, 3000));
  }
  connectionStatus(false);
}
main().catch(() => { console.error(ui('failed')); process.exitCode = 1; });
