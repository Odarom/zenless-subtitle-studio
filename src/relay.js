import { UserError } from './config.js';
import { cleanContent, MessageReferenceType, MessageFlags } from 'discord.js';
import { imageAttachments } from './media.js';
import { hasTranslatableText } from './emoji.js';
import { createHash } from 'node:crypto';
const reviewHash = text => createHash('sha256').update(text).digest('hex');

const forwardLabels = { ko: '전달된 글', en: 'Forwarded message', ja: '転送されたメッセージ', 'zh-CN': '转发消息', 'zh-Hant': '轉發訊息', de: 'Weitergeleitete Nachricht', fr: 'Message transféré', es: 'Mensaje reenviado', pt: 'Mensagem encaminhada', ru: 'Пересланное сообщение', th: 'ข้อความที่ส่งต่อ', vi: 'Tin nhắn được chuyển tiếp', id: 'Pesan diteruskan' };

export function messageText(message) {
  const clean = part => {
    if (!part.channel) return (part.cleanContent ?? part.content ?? '').trim();
    // cleanContent converts custom emoji into :name:. Keep the original emoji markup.
    return (part.content ?? '').split(/(<a?:[A-Za-z0-9_]+:\d{17,20}>)/g)
      .map(piece => /^<a?:[A-Za-z0-9_]+:\d{17,20}>$/.test(piece) ? piece : cleanContent(piece, part.channel)).join('').trim();
  };
  if (message.reference?.type !== MessageReferenceType.Forward) return clean(message);
  // Read only the snapshot deliberately shared here, never fetch its original channel/message.
  return [...(message.messageSnapshots?.values() ?? [])]
    .map(clean)
    .filter(Boolean).join('\n\n');
}

export class SerialQueue {
  constructor(limit = 100) { this.tail = Promise.resolve(); this.pending = 0; this.limit = limit; }
  run(task) {
    if (this.pending >= this.limit) return Promise.reject(new UserError('번역 대기열이 가득 찼습니다. 잠시 후 다시 보내주세요.'));
    this.pending++;
    const result = this.tail.then(task);
    this.tail = result.catch(() => {}).finally(() => { this.pending--; });
    return result;
  }
}

export function splitText(text, size = 1900) {
  const chunks = [];
  let chunk = '';
  for (const char of text) {
    if (chunk.length + char.length > size) { chunks.push(chunk); chunk = ''; }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export function displayName(name, translated = true) {
  const clean = name.replace(/[\r\n\t\u0000-\u001f]/g, ' ').replace(/discord|clyde/gi, 'user').trim();
  return `${Array.from(clean || 'User').slice(0, 60).join('')} · ${translated ? '번역' : '공유'}`;
}

export class Relay {
  constructor({ store, translator, transport, config, now = Date.now, reviewInfo = () => ({}) }) {
    Object.assign(this, { store, translator, transport, config, now, reviewInfo });
    this.history = new Map();
  }
  context(key) {
    const recent = (this.history.get(key) ?? []).filter(m => this.now() - m.at < 15 * 60 * 1000);
    this.history.set(key, recent);
    return this.config.contextMessages ? recent.slice(-this.config.contextMessages) : [];
  }
  pruneHistory() {
    for (const key of this.history.keys()) {
      this.context(key);
      if (!this.history.get(key).length) this.history.delete(key);
    }
  }
  forgetGroup(key) { this.history.delete(key); }
  remember(group, message, language, text) {
    if (!this.config.contextMessages) return;
    const recent = this.context(group.key).filter(m => m.id !== message.id);
    recent.push({ id: message.id, speaker: message.author.id, language, text: text.slice(0, 800), at: this.now() });
    this.history.set(group.key, recent.slice(-Math.max(1, this.config.contextMessages)));
  }
  async handle(message, { edited = false } = {}) {
    if (!message.guildId || message.author?.bot || message.webhookId || message.system) return;
    const route = this.store.route(message.channelId);
    if (!route || route.group.guildId !== message.guildId || route.group.paused) return;
    const { group, source } = route;
    const existing = this.store.record(message.id);
    if (existing && !edited) return;
    if (edited && !existing) return; // Never backfill messages sent before the bot was linked.
    if (existing && existing.groupKey !== group.key) return; // Don't move old messages into a newly linked conversation.
    const forwarded = message.reference?.type === MessageReferenceType.Forward;
    const text = messageText(message);
    const images = imageAttachments(message);
    if (!text && !images.length) {
      if (existing) await this.remove(message.id);
      if (forwarded && group.channels.length > 1) throw new UserError('전달된 메시지에서 공유할 텍스트나 이미지를 찾지 못했습니다. 다른 첨부 파일은 아직 지원하지 않습니다.');
      return;
    }
    const destinations = group.channels.filter(c => c.id !== source.id);
    if (!destinations.length) return;
    if (text.length > this.config.maxChars) throw new UserError(`번역은 메시지당 ${this.config.maxChars}자까지 지원합니다. 나눠서 보내주세요.`);
    const context = this.context(group.key).filter(m => m.id !== message.id);
    const reference = !forwarded && message.reference?.messageId ? this.store.resolve(message.reference.messageId) : null;
    const linkedReference = reference?.groupKey === group.key ? reference : null;
    const reply = linkedReference ? context.find(m => m.id === linkedReference.id) : null;
    const files = images.length ? await this.transport.prepareImages(images) : [];
    const translated = hasTranslatableText(text);
    const info = translated ? this.reviewInfo(message.guildId) : {};
    const review = { translated, sourceLanguage: source.language, sourceTextHash: reviewHash(text), translatedAt: this.now() };
    for (const key of ['provider', 'model', 'style', 'glossaryHash', 'promptHash']) if (typeof info[key] === 'string') review[key] = info[key];
    const translations = translated ? await this.translator.translate({
      guildId: message.guildId,
      text, sourceLanguage: source.language,
      targets: [...new Set(destinations.map(d => d.language))],
      context: context.map(({ speaker, language, text }) => ({ speaker, language, text })),
      reply: reply ? { text: reply.text, language: reply.language } : null,
    }) : Object.fromEntries(destinations.map(target => [target.language, text]));
    const record = existing ?? {
      id: message.id, groupKey: group.key, guildId: message.guildId,
      sourceChannelId: source.id, createdAt: this.now(), copies: {},
    };
    // Persist after every successful send so partial delivery never triggers a full replay.
    this.store.put(record);
    let failures = 0;
    for (const target of destinations) {
      try {
        const replyId = linkedReference?.sourceChannelId === target.id ? linkedReference.id : linkedReference?.copies[target.id]?.ids[0];
        const prefix = forwarded ? `↪ ${forwardLabels[target.language]}\n` : replyId ? `↪ https://discord.com/channels/${message.guildId}/${target.id}/${replyId}\n` : '';
        const chunks = splitText(prefix + translations[target.language]);
        if (!chunks.length && files.length) chunks.push('');
        const prior = record.copies[target.id] ?? { webhookId: target.webhookId, ids: [] };
        record.copies[target.id] = prior;
        for (let i = 0; i < chunks.length; i++) {
          // Let Discord render attachments and link previews; only suppress when
          // the source author explicitly suppressed them. Explicit 0 also clears
          // the old suppression flag when an existing copy is edited.
          const flags = message.flags?.has?.(MessageFlags.SuppressEmbeds) ? MessageFlags.SuppressEmbeds : 0;
          const payload = { content: chunks[i], username: displayName(message.member?.displayName ?? message.author.globalName ?? message.author.username, translated), avatarURL: message.member?.displayAvatarURL?.() ?? message.author.displayAvatarURL?.(), allowedMentions: { parse: [], repliedUser: false }, flags, attachments: [], ...(i === 0 && files.length ? { files } : {}) };
          if (prior.ids[i]) await this.transport.edit(prior.webhookId, prior.ids[i], payload);
          else {
            const sent = await this.transport.send(target, payload);
            prior.ids.push(sent.id);
            this.store.put(record);
          }
        }
        while (prior.ids.length > chunks.length) {
          await this.transport.delete(prior.webhookId, prior.ids.at(-1));
          prior.ids.pop();
          this.store.put(record);
        }
        // Keep hashes and version metadata, not message bodies. Reports capture
        // the selected text only when a user explicitly submits an issue.
        prior.review = { ...review, textHashes: chunks.map(reviewHash) };
      } catch { failures++; }
    }
    this.store.put(record);
    if (text) this.remember(group, message, source.language, text);
    if (failures) throw new UserError(`${failures}개 채널에 번역을 전달하지 못했습니다. 봇의 채널·웹훅 권한을 확인하세요. 중복 방지를 위해 자동 재전송하지 않았습니다.`);
  }
  async invalidate(id) {
    const record = this.store.record(id);
    if (!record) return;
    for (const copy of Object.values(record.copies)) {
      for (const messageId of copy.ids) {
        await this.transport.edit(copy.webhookId, messageId, {
          content: '⚠ 원문 변경 · 번역 갱신 실패 / Original edited · translation update failed',
          allowedMentions: { parse: [] }, flags: 4,
        }).catch(() => {});
      }
    }
    this.history.set(record.groupKey, (this.history.get(record.groupKey) ?? []).filter(m => m.id !== id));
  }
  async remove(id) {
    const record = this.store.record(id);
    if (!record) return;
    let failures = 0;
    for (const [channelId, copy] of Object.entries(record.copies)) {
      const remaining = [];
      for (const messageId of copy.ids) {
        try { await this.transport.delete(copy.webhookId, messageId); }
        catch { failures++; remaining.push(messageId); }
      }
      if (remaining.length) copy.ids = remaining;
      else delete record.copies[channelId];
    }
    this.history.set(record.groupKey, (this.history.get(record.groupKey) ?? []).filter(m => m.id !== id));
    if (failures) { this.store.put(record); throw new UserError('일부 번역문을 삭제하지 못했습니다. 해당 채널의 권한을 확인하세요.'); }
    this.store.remove(id);
  }
}
