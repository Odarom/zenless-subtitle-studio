import { ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { LANGUAGES, UserError } from './config.js';
import { seoulDay } from './store.js';
import { requireManager } from './api-setup.js';
import { downloadImages } from './media.js';

export class DiscordTransport {
  constructor(client) { this.client = client; this.hooks = new Map(); }
  prepareImages(images) { return downloadImages(images); }
  async hook(id) {
    if (!this.hooks.has(id)) this.hooks.set(id, await this.client.fetchWebhook(id));
    return this.hooks.get(id);
  }
  async send(target, payload) { return (await this.hook(target.webhookId)).send(payload); }
  async edit(id, messageId, payload) {
    const { username, avatarURL, ...editable } = payload;
    return (await this.hook(id)).editMessage(messageId, editable);
  }
  async delete(id, messageId) {
    try { return await (await this.hook(id)).deleteMessage(messageId); }
    catch (error) { if (error.code !== 10008) throw error; }
  }
}

export async function handleCommand(interaction, { store, config, relay, client, translator, vault, apiSetup }) {
  requireManager(interaction);
  const sub = interaction.options.getSubcommand();
  if (sub === 'api-delete') {
    vault.delete(interaction.guildId);
    apiSetup.cancelGuild(interaction.guildId);
    for (const group of store.groups(interaction.guildId)) relay.forgetGroup(group.key);
    return '이 서버의 API 키를 삭제하고 번역을 중지했습니다. 다른 키로 대신 호출하지 않습니다. 다시 쓰려면 /zzz api-set으로 등록하세요. API 제공사에서의 키 폐기는 별도로 해야 합니다.';
  }
  if (sub === 'api-status') {
    const status = translator.status(interaction.guildId);
    return status.configured ? `이 서버의 번역 설정: ${status.provider}\n모델: ${status.model}\n하루 최대 ${status.dailyLimit}회 / 설정 위치: ${status.source}\n키는 표시하지 않습니다. 등록 상태이며 실제 연결·무료 한도는 별도 확인이 필요합니다.` : '이 서버의 API가 미설정 또는 삭제된 상태입니다. /zzz api-set으로 등록하세요.';
  }
  if (sub === 'link') {
    const channel = interaction.options.getChannel('channel', true);
    const name = interaction.options.getString('group', true);
    const language = interaction.options.getString('language', true);
    if (channel.type !== ChannelType.GuildText || channel.guildId !== interaction.guildId) throw new UserError('이 서버의 일반 텍스트 채널을 선택하세요.');
    store.validateLink(interaction.guildId, name, channel.id, language);
    const me = await interaction.guild.members.fetchMe();
    const needed = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageWebhooks];
    if (!channel.permissionsFor(me)?.has(needed)) throw new UserError('봇에 채널 보기·메시지 보내기·메시지 기록 보기·웹훅 관리 권한이 필요합니다.');
    const hooks = await channel.fetchWebhooks();
    let hook = hooks.find(h => h.owner?.id === client.user.id && h.name === 'ZZZ Translator' && h.token);
    if (!hook) hook = await channel.createWebhook({ name: 'ZZZ Translator', reason: '젠레스 번역 채널 연결' });
    const group = store.link(interaction.guildId, name, channel.id, language, hook.id);
    relay.forgetGroup(group.key);
    const status = translator.status(interaction.guildId);
    return `연결 완료: **${name}** / <#${channel.id}> / ${LANGUAGES[language]}\n${group.channels.length < 2 ? '다른 언어 채널을 하나 더 연결하세요.' : '언어 채널 연결이 준비되었습니다.'}\n${!status.configured ? '번역하려면 /zzz api-set으로 이 서버의 API를 먼저 등록하세요.' : `새 텍스트와 최근 문맥을 ${status.provider === 'ollama' ? '봇 PC의 로컬 AI에서 처리' : `${status.provider} API로 전송`}합니다.`} 채널 공개 범위는 Discord에서 직접 설정하세요.`;
  }
  if (sub === 'unlink') {
    const channel = interaction.options.getChannel('channel', true);
    if (channel.guildId !== interaction.guildId || store.route(channel.id)?.group.guildId !== interaction.guildId) throw new UserError('이 서버에 연결된 채널을 선택하세요.');
    const group = store.unlink(channel.id);
    relay.forgetGroup(group.key);
    return '연결을 해제했습니다. 채널과 기존 메시지는 유지됩니다.';
  }
  if (sub === 'pause' || sub === 'resume') {
    const name = interaction.options.getString('group', true);
    store.pause(interaction.guildId, name, sub === 'pause');
    if (sub === 'pause') relay.forgetGroup(store.group(interaction.guildId, name).key);
    return `${name}: ${sub === 'pause' ? '번역을 중지했습니다.' : '번역을 다시 시작했습니다.'}`;
  }
  if (sub === 'usage') {
    const usage = store.scoped(interaction.guildId).usage();
    const status = translator.status(interaction.guildId);
    return `**${seoulDay()} (서울 시간) · 이 서버 사용량**\nAI 요청: ${usage.requests} / ${status.configured ? status.dailyLimit : '미설정'}회\n입력 토큰: ${usage.inputTokens.toLocaleString()} / 출력 토큰: ${usage.outputTokens.toLocaleString()}\n현재 방식: ${status.configured ? `${status.provider} / ${status.model}` : '미설정'}\n실패한 요청도 횟수에 포함합니다. ${status.provider === 'ollama' ? '현재 로컬 번역에는 API 요금이 없습니다.' : '요청 횟수 한도는 금액 한도가 아닙니다. 무료 사용 여부·요금은 해당 API 프로젝트에서 확인하세요.'}`;
  }
  const groups = store.groups(interaction.guildId);
  return groups.length ? groups.map(g => `**${g.name}** · ${g.paused ? '중지' : g.channels.length >= 2 ? '작동' : '채널 추가 필요'}\n${g.channels.map(c => `<#${c.id}> → ${LANGUAGES[c.language]}`).join('\n')}`).join('\n\n').slice(0, 1900) : '연결된 채널이 없습니다. /zzz link로 연결하세요.';
}

export async function respondToCommand(interaction, dependencies, queue) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'zzz') return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const result = await queue.run(() => handleCommand(interaction, dependencies));
    await interaction.editReply({ content: result, allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('command failed', error.name, error.code ?? '');
    await interaction.editReply({ content: error instanceof UserError ? error.message : '설정에 실패했습니다. 봇의 권한과 연결 상태를 확인하세요.', allowedMentions: { parse: [] } });
  }
}
