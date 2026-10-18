import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { resolve } from 'node:path';
import { mkdirSync, openSync, closeSync, readFileSync, existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { settings, UserError } from './config.js';
import { Store } from './store.js';
import { loadGlossary } from './translator.js';
import { Relay, SerialQueue } from './relay.js';
import { DiscordTransport, respondToCommand } from './discord.js';
import { GuildVault } from './vault.js';
import { GuildTranslator } from './guild-translator.js';
import { ApiSetup, respondToApi } from './api-setup.js';
import { imageRevision } from './media.js';
import { createHash } from 'node:crypto';
import { ReportStore } from './report-store.js';
import { ReportFlow, respondToReports, respondToReportMessage } from './report-flow.js';
import { ReportSharing } from './report-sharing.js';
import { updateSharedGlossary } from './shared-glossary.js';
import { RunnerBroker, runnerServer } from './runner-broker.js';
import { runnerOrigin } from './runner-client.js';

function lockProcess() {
  mkdirSync('data', { recursive: true });
  const path = resolve('data/bot.lock');
  try {
    const oldPid = Number(readFileSync(path, 'utf8'));
    if (!Number.isSafeInteger(oldPid) || oldPid <= 0) throw new UserError('data/bot.lock을 확인하세요.');
    try { process.kill(oldPid, 0); throw new UserError('봇이 이미 실행 중입니다. 창을 두 개 열면 중복 번역될 수 있습니다.'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    unlinkSync(path);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fd = openSync(path, 'wx');
  writeFileSync(fd, String(process.pid)); closeSync(fd);
  process.once('exit', () => { try { unlinkSync(path); } catch {} });
}

async function main() {
  const config = settings(process.env, { requireTranslation: false });
  loadGlossary(resolve('glossary/zzz.json'));
  lockProcess();
  const sharedPath = resolve('data/shared-glossary.json');
  let glossaryPath = resolve('glossary/zzz.json');
  if (existsSync(sharedPath)) { try { loadGlossary(sharedPath); glossaryPath = sharedPath; } catch { console.warn('공용 DB 캐시를 읽지 못해 포함된 용어집을 사용합니다.'); } }
  const refresh = async () => {
    try {
      const result = await updateSharedGlossary(sharedPath); glossaryPath = sharedPath;
      if (result.updated) console.log('공용 번역 데이터베이스를 갱신했습니다.');
    } catch { console.warn('공용 DB 갱신에 실패했습니다. 마지막 용어집을 계속 사용합니다.'); }
  };
  if (process.env.SHARED_GLOSSARY_UPDATES !== 'off') await refresh();
  console.log(config.apiMode === 'runner' ? '개인 번역 연결 모드. API 키는 받지 않습니다. /zzz connect로 연결하세요.' : '개인 설치용 직접 API 모드. /zzz api-set의 키는 이 봇 운영자가 복호화할 수 있습니다.');
  const store = new Store(resolve('data/state.json'));
  store.migrateLegacyUsage(config.guildId);
  const broker = config.apiMode === 'runner' ? new RunnerBroker(resolve('data/runner-broker.sqlite')) : undefined;
  const vault = broker ? { forget: id => broker.disconnect(id) } : new GuildVault(resolve('data/guild-api.json'), resolve('.secrets/api-vault.key'));
  let bridge;
  if (broker) {
    config.runnerUrl = runnerOrigin(process.env.RUNNER_PUBLIC_URL || 'https://reports.140-238-54-74.sslip.io');
    bridge = runnerServer(broker); await new Promise((done, reject) => { bridge.once('error', reject); bridge.listen(4322, '127.0.0.1', done); });
  }
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel],
    allowedMentions: { parse: [], repliedUser: false },
  });
  const translator = broker ? { glossaryPath, status: id => broker.status(id), translate: ({ guildId, ...input }) => broker.translate(guildId, input) } : new GuildTranslator(config, store, vault, glossaryPath);
  if (process.env.SHARED_GLOSSARY_UPDATES !== 'off') {
    let refreshing = false;
    setInterval(async () => { if (refreshing) return; refreshing = true; try { await refresh(); translator.glossaryPath = glossaryPath; } finally { refreshing = false; } }, 6 * 3600000).unref();
  }
  const apiSetup = new ApiSetup(vault, config);
  const reports = new ReportStore(resolve('data/reports.sqlite'));
  const sharing = process.env.PROJECT_REPORT_SHARING === 'off' ? undefined : new ReportSharing(resolve('data/report-sharing.json'));
  const reportFlow = new ReportFlow({ store, reports, client, sharing });
  const promptHash = createHash('sha256').update(readFileSync(resolve('src/translator.js'))).digest('hex');
  const relay = new Relay({ store, translator, transport: new DiscordTransport(client), config,
    reviewInfo: guildId => ({ ...translator.status(guildId), style: config.style,
      ...(broker ? {} : { promptHash, glossaryHash: createHash('sha256').update(readFileSync(translator.glossaryPath)).digest('hex') }) }),
  });
  setInterval(() => relay.pruneHistory(), 60000).unref();
  const queues = new Map();
  const queueFor = guildId => {
    if (!queues.has(guildId)) queues.set(guildId, new SerialQueue());
    return queues.get(guildId);
  };
  setInterval(() => {
    apiSetup.prune();
    reportFlow.prune();
    try { reports.prune(); } catch { console.error('신고 보관 기간 정리 실패'); }
    for (const [id, queue] of queues) if (!queue.pending) queues.delete(id);
  }, 60000).unref();
  const notices = new Map();
  async function report(message, error) {
    console.error('relay failed', error.name, error.code ?? '', error.phase ?? '', Number.isSafeInteger(error.elapsedMs) ? `${error.elapsedMs}ms` : '');
    if (Date.now() - (notices.get(message.channelId) ?? 0) < 30000) return;
    notices.set(message.channelId, Date.now());
    await message.channel?.send({
      content: `⚠ ${error instanceof UserError ? error.message : '번역 처리에 실패했습니다. 봇 설정과 연결 상태를 확인하세요.'}`,
      allowedMentions: { parse: [] },
    }).catch(() => {});
  }
  const eligible = m => m.guildId && store.route(m.channelId)?.group.guildId === m.guildId && !m.author?.bot && !m.webhookId;
  client.on(Events.MessageCreate, message => {
    void (async () => {
      if (await respondToReportMessage(message, { reportFlow })) return;
      if (eligible(message)) await queueFor(message.guildId).run(() => relay.handle(message));
    })().catch(error => report(message, error));
  });
  client.on(Events.MessageUpdate, (oldMessage, message) => {
    if (!eligible(message) || (oldMessage.content === message.content && imageRevision(oldMessage) === imageRevision(message) && !message.partial)) return;
    void queueFor(message.guildId).run(async () => {
      if (!store.record(message.id)) return;
      try {
        const full = message.partial ? await message.fetch() : message;
        if (store.route(full.channelId)?.group.paused) { await relay.invalidate(full.id); return; }
        await relay.handle(full, { edited: true });
      } catch (error) { await relay.invalidate(message.id); await report(message, error); }
    }).catch(error => report(message, error));
  });
  client.on(Events.MessageDelete, message => {
    if (!message.guildId || store.record(message.id)?.guildId !== message.guildId) return;
    void queueFor(message.guildId).run(() => relay.remove(message.id)).catch(error => report(message, error));
  });
  client.on(Events.MessageBulkDelete, messages => {
    const guildId = messages.first()?.guildId;
    if (!guildId) return;
    void queueFor(guildId).run(async () => {
      for (const message of messages.values()) {
        if (store.record(message.id)?.guildId !== guildId) continue;
        try { await relay.remove(message.id); } catch (error) { await report(message, error); }
      }
    }).catch(() => console.error('삭제 처리 대기열이 가득 찼습니다.'));
  });
  client.on(Events.InteractionCreate, interaction => {
    const dependencies = { store, config, relay, client, translator, vault, apiSetup, reports, reportFlow, broker };
    const queue = queueFor(interaction.guildId || 'dm');
    void (async () => {
      if (await respondToReports(interaction, dependencies)) return;
      if (await respondToApi(interaction, dependencies, queue)) return;
      await respondToCommand(interaction, dependencies, queue);
    })().catch(() => console.error('명령 응답 연결 실패'));
  });
  client.on(Events.GuildDelete, guild => {
    void queueFor(guild.id).run(() => {
      vault.forget(guild.id); apiSetup.cancelGuild(guild.id);
      reportFlow.cancelGuild(guild.id); reports.forgetGuild(guild.id);
      for (const group of store.groups(guild.id)) {
        relay.forgetGroup(group.key);
        for (const channel of [...group.channels]) store.unlink(channel.id);
      }
    }).catch(() => console.error('서버 탈퇴 후 API 설정 정리 실패'));
  });
  client.on(Events.Error, error => console.error('Discord 연결 오류', error.name, error.code ?? ''));
  client.once(Events.ClientReady, ready => {
    console.log(`봇 연결 완료: ${ready.user.tag}`);
    console.log(config.apiMode === 'runner' ? '/zzz connect로 개인 번역 프로그램을 연결하고 /zzz link로 채널을 연결하세요. 종료: Ctrl+C' : '/zzz api-set으로 API를 등록하고 /zzz link로 채널을 연결하세요. 종료: Ctrl+C');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { bridge?.close(); broker?.close(); reports.close(); client.destroy(); process.exit(0); });
  await client.login(config.token);
}

main().catch(error => {
  console.error(error instanceof UserError ? error.message : `시작 실패 (${error.code ?? error.name}). 토큰, 인터넷 연결, Message Content Intent를 확인하세요.`);
  process.exitCode = 1;
});
