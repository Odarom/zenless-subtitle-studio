import { randomBytes } from 'node:crypto';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, LabelBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { UserError } from './config.js';
import { messageText } from './relay.js';
import { REPORT_MENU_NAME } from './report-commands.js';
import { REPORT_TYPES, textHash, reportSnapshot } from './report-store.js';
import { seoulDay } from './store.js';
import { reportText as t, reportStatus, reportType, reportError } from './report-i18n.js';
import { normalizeSharedDiscordReport } from './shared-report.js';

const PREFIX = 'zzz:report:';
const SESSION_MS = 10 * 60 * 1000;
const MESSAGE_LINK = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})\/?$/;
function requireGuild(interaction) {
  if (!interaction.inGuild() || interaction.user?.bot) throw new UserError('서버 안에서 사용하세요.');
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ViewChannel)) throw new UserError('이 채널을 볼 수 있는 사용자만 신고할 수 있습니다.');
}
const clip = (text, max = 650) => text.length > max ? `${text.slice(0, max)}…` : text;
async function timeout(promise, ms = 5000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Report source timeout')), ms); })]); }
  finally { clearTimeout(timer); }
}

export class ReportFlow {
  constructor({ store, reports, client, sharing, now = Date.now }) { Object.assign(this, { store, reports, client, sharing, now }); this.pending = new Map(); this.opened = new Map(); this.publicOpened = new Map(); this.shares = new Map(); }
  prune() {
    for (const [id, item] of this.pending) if (item.expires <= this.now()) this.pending.delete(id);
    for (const [key, time] of this.opened) if (time + 3000 <= this.now()) this.opened.delete(key);
    for (const [key, time] of this.publicOpened) if (time + 10000 <= this.now()) this.publicOpened.delete(key);
    for (const [key, item] of this.shares) if (item.expires <= this.now() && !item.sending) this.shares.delete(key);
  }
  cancelGuild(guildId) {
    for (const [id, item] of this.pending) if (item.guildId === guildId) this.pending.delete(id);
    for (const key of this.opened.keys()) if (key.startsWith(`${guildId}:`)) this.opened.delete(key);
    for (const key of this.publicOpened.keys()) if (key.startsWith(`${guildId}:`)) this.publicOpened.delete(key);
    for (const [key, item] of this.shares) if (item.guildId === guildId) this.shares.delete(key);
  }
  session(interaction, stage) {
    requireGuild(interaction); this.prune();
    const nonce = interaction.customId.slice(`${PREFIX}${stage}:`.length);
    const session = this.pending.get(nonce);
    if (!session || session.guildId !== interaction.guildId || session.userId !== interaction.user.id) throw new UserError('신고 창이 만료되었거나 본인의 요청이 아닙니다. 번역 메시지에서 오역 신고를 다시 선택하세요.');
    const route = this.store.route(session.target.channelId);
    if (!route || route.group.key !== session.groupKey || route.group.guildId !== session.guildId) throw new UserError('이 메시지의 채널 연결이 변경되었습니다. 오역 신고를 다시 선택하세요.');
    if (session.target.channelId !== interaction.channelId && !this.client.channels.cache?.get(session.target.channelId)
      ?.permissionsFor(interaction.user.id)?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory)) {
      throw new UserError('해당 번역 채널을 볼 수 있고 메시지 기록을 읽을 수 있어야 신고할 수 있습니다.');
    }
    return { nonce, session };
  }
  checkOpening(interaction) {
    requireGuild(interaction); this.prune();
    if (!this.sharing) throw new UserError(t(interaction, 'projectUnavailable'));
    this.reports.checkCapacity(interaction.guildId, interaction.user.id);
    const key = `${interaction.guildId}:${interaction.user.id}`;
    if (this.opened.has(key)) throw new UserError('신고 창은 3초에 한 번 열 수 있습니다. 잠시 후 다시 시도하세요.');
    if (this.pending.size >= 500) throw new UserError('신고 작성 요청이 많습니다. 잠시 후 다시 시도하세요.');
    this.opened.set(key, this.now());
  }
  async beginFromLink(interaction) {
    requireGuild(interaction);
    const match = MESSAGE_LINK.exec(interaction.options.getString('message', true).trim());
    if (!match) throw new UserError('번역 메시지를 우클릭 → 메시지 링크 복사한 주소를 message 항목에 넣으세요.');
    const [, guildId, channelId, messageId] = match;
    return this.beginFromMessage(interaction, guildId, channelId, messageId);
  }
  async beginFromButton(interaction) {
    requireGuild(interaction);
    const match = /^zzz:report:start:(\d{17,20}):(\d{17,20}):(\d{17,20})$/.exec(interaction.customId);
    if (!match || match[1] !== interaction.user.id) throw new UserError('이 신고 버튼은 요청한 사용자만 사용할 수 있습니다. 본인은 번역 메시지에 답장으로 !report를 보내세요.');
    return this.beginFromMessage(interaction, interaction.guildId, match[2], match[3]);
  }
  async beginFromMessage(interaction, guildId, channelId, messageId) {
    requireGuild(interaction);
    if (guildId !== interaction.guildId) throw new UserError('이 서버 안의 번역 메시지 링크를 사용하세요.');
    const route = this.store.route(channelId);
    if (!route || route.group.guildId !== guildId) throw new UserError('연결된 언어 채널의 봇 번역 메시지 링크를 사용하세요.');
    this.checkOpening(interaction);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let channel;
    try { channel = await timeout(this.client.channels.fetch(channelId)); }
    catch { throw new UserError('번역 채널을 확인하지 못했습니다. 잠시 후 다시 시도하세요.'); }
    const permissions = channel?.permissionsFor?.(interaction.user.id);
    if (channel?.guildId !== guildId || !channel.isTextBased?.() || !channel.messages
      || !permissions?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory)) {
      throw new UserError('해당 번역 채널을 볼 수 있고 메시지 기록을 읽을 수 있어야 신고할 수 있습니다.');
    }
    let target;
    try { target = await timeout(channel.messages.fetch(messageId)); }
    catch { throw new UserError('번역 메시지를 찾지 못했습니다. 삭제 여부와 메시지 링크를 확인하세요.'); }
    if (target?.id !== messageId || target.channelId !== channelId) throw new UserError('번역 메시지 링크를 확인하세요.');
    await this.begin(interaction, target, channelId);
  }
  async begin(interaction, target = interaction.targetMessage, channelId = interaction.channelId) {
    requireGuild(interaction); this.prune();
    const route = this.store.route(channelId);
    if (!route || route.group.guildId !== interaction.guildId || !target || target.channelId !== channelId
      || target.webhookId !== route.source.webhookId || !target.content?.trim()) throw new UserError('연결된 언어 채널의 봇 번역 메시지에서 신고하세요. 이미지·이모지만 공유한 메시지는 대상이 아닙니다.');
    const record = this.store.resolve(target.id);
    const copy = record?.copies[channelId];
    if (record && (record.guildId !== interaction.guildId || record.groupKey !== route.group.key || !copy?.ids.includes(target.id))) throw new UserError('이 번역 메시지의 연결 정보를 확인할 수 없습니다.');
    if (copy?.review?.translated === false) throw new UserError('이미지·이모지만 공유한 메시지는 오역 신고 대상이 아닙니다.');
    if (!interaction.deferred) this.checkOpening(interaction);
    for (const [id, item] of this.pending) if (item.guildId === interaction.guildId && item.userId === interaction.user.id) this.pending.delete(id);
    if (this.pending.size >= 500) throw new UserError('신고 작성 요청이 많습니다. 잠시 후 다시 시도하세요.');
    const nonce = randomBytes(16).toString('hex');
    // Reserve a bounded session before fetching; never fetch channel history.
    const session = { guildId: interaction.guildId, userId: interaction.user.id, groupKey: route.group.key,
      expires: this.now() + SESSION_MS, ready: false,
      target: { text: target.content, messageId: target.id, channelId, language: route.source.language },
      source: { text: '', messageId: record?.id ?? null, channelId: record?.sourceChannelId ?? null, language: copy?.review?.sourceLanguage ?? null },
      metadata: {}, expectedSourceHash: null,
    };
    this.pending.set(nonce, session);
    if (!interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let review = copy?.review;
    if (review && review.textHashes?.[copy.ids.indexOf(target.id)] !== textHash(target.content)) review = null;
    if (review) {
      session.expectedSourceHash = review.sourceTextHash;
      for (const key of ['provider', 'model', 'style', 'glossaryHash', 'promptHash', 'translatedAt']) if (review[key] !== undefined) session.metadata[key] = review[key];
    }
    const sourceRoute = record && this.store.route(record.sourceChannelId);
    if (record && sourceRoute?.group.key === route.group.key && sourceRoute.group.guildId === interaction.guildId) {
      try {
        const sourceChannel = await timeout(this.client.channels.fetch(record.sourceChannelId));
        if (sourceChannel?.guildId !== interaction.guildId) throw new Error('Report source guild mismatch');
        const original = await timeout(sourceChannel.messages.fetch(record.id));
        if (original.id !== record.id || original.channelId !== record.sourceChannelId) throw new Error('Report source message mismatch');
        const originalText = messageText(original);
        if (originalText.length <= 2000) session.source.text = originalText;
        session.source.language ??= sourceRoute.source.language;
      } catch { /* The reporter can supply a missing/edited original in the modal. */ }
    }
    if (this.pending.get(nonce) !== session) throw new UserError('다른 신고 창이 열렸습니다. 가장 최근 창에서 작성하세요.');
    session.ready = true;
    const verified = session.expectedSourceHash && textHash(session.source.text) === session.expectedSourceHash;
    const originalHint = t(interaction, !session.source.text ? 'missing' : verified ? 'verified' : 'unverified');
    const preview = new EmbedBuilder().setTitle(t(interaction, 'preview'))
      .setDescription(t(interaction, 'notice'))
      .addFields({ name: t(interaction, 'source'), value: clip(session.source.text) || t(interaction, 'manual') },
        { name: t(interaction, 'target'), value: clip(session.target.text) }, { name: t(interaction, 'check'), value: originalHint });
    await interaction.editReply({ embeds: [preview], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}write:${nonce}`).setLabel(t(interaction, 'write')).setStyle(ButtonStyle.Primary),
    )], allowedMentions: { parse: [] } });
  }
  async openModal(interaction) {
    const { nonce, session } = this.session(interaction, 'write');
    if (!session.ready) throw new UserError('원문 확인이 끝난 뒤 신고를 작성하세요.');
    const field = (id, label, description, max, required, value, style = TextInputStyle.Paragraph) => {
      const input = new TextInputBuilder().setCustomId(id).setStyle(style).setRequired(required).setMaxLength(max);
      if (value) input.setValue(value);
      return new LabelBuilder().setLabel(label).setDescription(description).setTextInputComponent(input);
    };
    const modal = new ModalBuilder().setCustomId(`${PREFIX}submit:${nonce}`).setTitle(t(interaction, 'title'))
      .addLabelComponents(
        new LabelBuilder().setLabel(t(interaction, 'type')).setStringSelectMenuComponent(new StringSelectMenuBuilder().setCustomId('type')
          .setRequired(true).setMinValues(1).setMaxValues(1).addOptions(Object.keys(REPORT_TYPES).map(value => ({ label: reportType(interaction, value), value })))),
        field('source', t(interaction, 'confirm'), t(interaction, 'confirmHelp'), 2000, true, session.source.text),
        field('fragment', t(interaction, 'fragment'), t(interaction, 'fragmentHelp'), 200, false, undefined, TextInputStyle.Short),
        field('explanation', t(interaction, 'explanation'), t(interaction, 'explanationHelp'), 1000, true),
        field('suggestion', t(interaction, 'suggestion'), t(interaction, 'suggestionHelp'), 2000, false),
      );
    await interaction.showModal(modal);
  }
  async submit(interaction) {
    const { nonce, session } = this.session(interaction, 'submit');
    this.pending.delete(nonce);
    if (!session.ready) throw new UserError('원문 확인이 끝나지 않았습니다. 다시 신고하세요.');
    const choices = interaction.fields.getStringSelectValues('type');
    if (!Array.isArray(choices) || choices.length !== 1) throw new UserError('문제 유형을 하나 선택하세요.');
    const sourceText = interaction.fields.getTextInputValue('source').trim();
    const supplied = sourceText !== session.source.text || !session.source.text;
    const matched = session.expectedSourceHash ? textHash(sourceText) === session.expectedSourceHash : null;
    const input = {
      source: { ...session.source, text: sourceText, matchesTranslationSource: matched,
        provenance: supplied ? 'user-provided' : matched ? 'discord-verified' : 'discord-unverified' },
      target: session.target, metadata: session.metadata,
      issue: { type: choices[0], fragment: interaction.fields.getTextInputValue('fragment'),
        explanation: interaction.fields.getTextInputValue('explanation'), suggestion: interaction.fields.getTextInputValue('suggestion') },
    };
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!this.sharing) throw new UserError(t(interaction, 'projectUnavailable'));
    if (this.shares.size >= 500) throw new UserError('신고 작성 요청이 많습니다. 잠시 후 다시 시도하세요.');
    const report = { id: `R-${seoulDay(new Date(this.now())).replaceAll('-', '')}-${randomBytes(6).toString('hex')}`, ...reportSnapshot(input) };
    let preview;
    try { preview = normalizeSharedDiscordReport({ ...report, platform: 'discord' }); }
    catch { throw new UserError(t(interaction, 'projectPreviewInvalid')); }
    const item = { report, preview, groupKey:session.groupKey, guildId:session.guildId, userId:session.userId, expires:this.now()+SESSION_MS };
    this.shares.set(nonce,item);
    await this.showProjectPreview(interaction,nonce,item);
  }
  projectButtons(interaction,nonce) {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}send:${nonce}`).setLabel(t(interaction,'shareConfirm')).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`${PREFIX}cancel:${nonce}`).setLabel(t(interaction,'shareCancel')).setStyle(ButtonStyle.Secondary))];
  }
  async showProjectPreview(interaction,nonce,item) {
    item.confirmedPreview=true;
    await interaction.editReply({content:t(interaction,'shareNotice'),components:this.projectButtons(interaction,nonce),
      files:[new AttachmentBuilder(Buffer.from(JSON.stringify(item.preview,null,2)),{name:'report-preview.json'})],allowedMentions:{parse:[]}});
  }
  async share(interaction) {
    requireGuild(interaction); this.prune();
    const [, stage, nonce] = /^zzz:report:(share|send|cancel):([a-f0-9]{32})$/.exec(interaction.customId) || [];
    const item = this.shares.get(nonce);
    if (!item || item.guildId !== interaction.guildId || item.userId !== interaction.user.id || item.sending) throw new UserError(t(interaction, 'shareExpired'));
    if (stage === 'cancel') { this.shares.delete(nonce); await interaction.deferReply({ flags: MessageFlags.Ephemeral }); return interaction.editReply({ content:t(interaction,item.attempted?'projectRetryCancelled':'shareCancelled'), components:[] }); }
    if (!this.sharing) throw new UserError(t(interaction,'projectUnavailable'));
    const route=this.store.route(item.report.target.channelId);
    if (!route || route.group.key!==item.groupKey || route.group.guildId!==interaction.guildId) throw new UserError('이 메시지의 채널 연결이 변경되었습니다. 오역 신고를 다시 선택하세요.');
    if (item.report.target.channelId!==interaction.channelId && !this.client.channels.cache?.get(item.report.target.channelId)?.permissionsFor(interaction.user.id)?.has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.ReadMessageHistory)) throw new UserError('해당 번역 채널을 볼 수 있고 메시지 기록을 읽을 수 있어야 신고할 수 있습니다.');
    if (stage==='share') { await interaction.deferReply({flags:MessageFlags.Ephemeral}); return this.showProjectPreview(interaction,nonce,item); }
    if (!item.confirmedPreview) throw new UserError(t(interaction, 'shareExpired'));
    item.sending = true;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      // Persist only after explicit consent, as a retry/delivery record. There
      // is no separate submission to the bot operator before this step.
      const {report}=this.reports.create(item.guildId,item.userId,item.report,{id:item.report.id});
      const receipt=this.reports.shareReceipt(report.id);
      if(receipt){this.shares.delete(nonce);return interaction.editReply({content:t(interaction,'shareDone',{id:receipt}),components:[],allowedMentions:{parse:[]}});}
      const preview=normalizeSharedDiscordReport({...report,platform:'discord'});
      if(JSON.stringify(preview)!==JSON.stringify(item.preview)){
        item.report=report;item.preview=preview;item.sending=false;
        return this.showProjectPreview(interaction,nonce,item);
      }
      item.attempted=true;
      const id = await this.sharing.send(item.preview); this.reports.recordShare(report.id, id); this.shares.delete(nonce);
      await interaction.editReply({ content: t(interaction, 'shareDone', { id }), components: [], allowedMentions: { parse: [] } });
    } catch {
      item.sending = false;
      await interaction.editReply({ content: t(interaction, 'shareFailed'), components:this.projectButtons(interaction,nonce), allowedMentions: { parse: [] } });
    }
  }
  async status(interaction) {
    requireGuild(interaction);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    let content;
    if (sub === 'mine') {
      const mine = this.reports.list({ guildId: interaction.guildId, reporterId: interaction.user.id, status: 'all', limit: 10 });
      content = mine.length ? mine.map(r => `**${r.id}** · ${reportStatus(interaction, r.status)} · ${reportType(interaction, r.issue.type)}`).join('\n') : t(interaction, 'empty');
    } else if (sub === 'status') {
      const report = this.reports.forViewer(interaction.options.getString('id', true), interaction.guildId, interaction.user.id,
        interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
      content = `**${report.id}**\n${t(interaction, 'state')}: ${reportStatus(interaction, report.status)}\n${t(interaction, 'type')}: ${reportType(interaction, report.issue.type)}\n${report.review.note ? `${t(interaction, 'review')}: ${report.review.note}` : t(interaction, 'noReview')}`;
      const receipt = this.reports.shareReceipt(report.id);
      if (receipt) content += `\n${t(interaction, 'shareDone', { id: receipt })}`;
    } else throw new UserError('신고 조회 명령을 확인하세요.');
    await interaction.editReply({ content, allowedMentions: { parse: [] } });
  }
}

// A normal chat reply is an alternate entry point when command menus are
// unavailable. It never sends the report snapshot to the public channel.
export async function respondToReportMessage(message, { reportFlow }) {
  if (!message.guildId || message.author?.bot || message.webhookId || message.system) return false;
  const match = /^!(?:신고|report)(?:\s+(\S+))?\s*$/i.exec(message.content?.trim() ?? '');
  if (!match) return false;
  const route = reportFlow.store.route(message.channelId);
  if (!route || route.group.guildId !== message.guildId) return false;
  reportFlow.prune();
  const key = `${message.guildId}:${message.author.id}`;
  if (reportFlow.publicOpened.has(key) || reportFlow.publicOpened.size >= 500) return true;
  reportFlow.publicOpened.set(key, reportFlow.now());
  const ui = { locale: route.source.language };
  const reply = value => message.reply({ ...value, allowedMentions: { parse: [], repliedUser: false } });
  let guildId = message.guildId, channelId, messageId;
  if (match[1]) {
    const link = MESSAGE_LINK.exec(match[1]);
    if (link) [, guildId, channelId, messageId] = link;
  } else if (message.reference?.messageId && (!message.reference.guildId || message.reference.guildId === message.guildId)) {
    channelId = message.reference.channelId ?? message.channelId; messageId = message.reference.messageId;
  }
  if (guildId !== message.guildId || !/^\d{17,20}$/.test(channelId ?? '') || !/^\d{17,20}$/.test(messageId ?? '')
    || reportFlow.store.route(channelId)?.group.guildId !== message.guildId) {
    await reply({ content: t(ui, 'replyHelp') }); return true;
  }
  await reply({ content: t(ui, 'launchNotice'), components: [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}start:${message.author.id}:${channelId}:${messageId}`).setStyle(ButtonStyle.Secondary).setLabel(t(ui, 'launch')),
  )] });
  return true;
}

export async function respondToReports(interaction, { reportFlow }) {
  const menu = interaction.isMessageContextMenuCommand?.() && interaction.commandName === REPORT_MENU_NAME;
  const button = interaction.isButton?.() && interaction.customId.startsWith(`${PREFIX}write:`);
  const start = interaction.isButton?.() && interaction.customId.startsWith(`${PREFIX}start:`);
  const submit = interaction.isModalSubmit?.() && interaction.customId.startsWith(`${PREFIX}submit:`);
  const status = interaction.isChatInputCommand?.() && interaction.commandName === 'zzz-report';
  const share = interaction.isButton?.() && /^zzz:report:(share|send|cancel):/.test(interaction.customId);
  if (!menu && !button && !start && !submit && !status && !share) return false;
  try {
    if (share) await reportFlow.share(interaction);
    else if (menu) await reportFlow.begin(interaction);
    else if (start) await reportFlow.beginFromButton(interaction);
    else if (button) await reportFlow.openModal(interaction);
    else if (submit) await reportFlow.submit(interaction);
    else if (interaction.options.getSubcommand() === 'submit') await reportFlow.beginFromLink(interaction);
    else await reportFlow.status(interaction);
  } catch (error) {
    const content = error instanceof UserError ? reportError(interaction, error.message) : t(interaction, 'failure');
    const options = { content, allowedMentions: { parse: [] }, embeds: [], components: [] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(options);
    else await interaction.reply({ ...options, flags: MessageFlags.Ephemeral });
  }
  return true;
}
