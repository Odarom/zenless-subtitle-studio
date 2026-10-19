import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Store, seoulDay } from '../src/store.js';
import { settings, UserError } from '../src/config.js';
import { Translator, relevantTerms, loadGlossary } from '../src/translator.js';
import { Relay, SerialQueue, splitText, messageText } from '../src/relay.js';
import { handleCommand } from '../src/discord.js';
import { Collection, MessageReferenceType, PermissionFlagsBits, MessageFlags, MessageFlagsBitField } from 'discord.js';

const glossaryPath = resolve('glossary/zzz.json');
const makeStore = () => new Store(join(mkdtempSync(join(tmpdir(), 'zzz-test-')), 'state.json'));
const config = { ...settings({ TRANSLATION_PROVIDER: 'openai' }, { requireSecrets: false }), apiKey: 'test-key', guildId: 'guild' };
function linkFour(store) {
  for (const [channel, language] of [['kr', 'ko'], ['en', 'en'], ['jp', 'ja'], ['cn', 'zh-CN']]) store.link('guild', 'friends', channel, language, `hook-${channel}`);
}
const message = (id = 'm1', channelId = 'kr', content = '빠른 지원을 써') => ({ id, channelId, content, guildId: 'guild', author: { id: 'user1', username: '민수', bot: false, displayAvatarURL: () => 'https://example.com/avatar.png' }, member: { displayName: '민수' } });
function harness(store = makeStore()) {
  const calls = [], edits = [], deletes = [], prompts = [], downloads = [];
  const transport = {
    async prepareImages(images) { downloads.push(images); return images.map(image => ({ attachment: Buffer.from('fake-image'), name: image.name })); },
    async send(target, payload) { const id = `sent-${calls.length}`; calls.push({ target, payload, id }); return { id }; },
    async edit(hook, id, payload) { edits.push({ hook, id, payload }); },
    async delete(hook, id) { deletes.push({ hook, id }); },
  };
  const translator = { async translate(input) { prompts.push(input); return Object.fromEntries(input.targets.map(t => [t, `translated-${t}: ${input.text}`])); } };
  return { store, calls, edits, deletes, prompts, downloads, transport, relay: new Relay({ store, translator, transport, config }) };
}

test('routes reject reused channels and duplicate languages; paused state survives restart', () => {
  const store = makeStore(); linkFour(store);
  assert.throws(() => store.link('guild', 'other', 'kr', 'ko', 'x'), UserError);
  assert.throws(() => store.link('guild', 'friends', 'kr2', 'ko', 'x'), UserError);
  assert.throws(() => store.link('guild', '../bad', 'new', 'ko', 'x'), UserError);
  store.pause('guild', 'friends', true);
  assert.equal(new Store(store.path).route('en').group.paused, true);
  store.unlink('en'); assert.equal(store.route('en'), undefined);
});

test('budget is reserved before calls, persists across restart, resets at Seoul midnight', () => {
  const store = makeStore();
  store.reserve(1, '2026-10-06');
  assert.throws(() => new Store(store.path).reserve(1, '2026-10-06'), UserError);
  store.reserve(1, '2026-10-07');
  assert.equal(seoulDay(new Date('2026-10-06T15:00:00Z')), '2026-10-07');
  assert.equal(seoulDay(new Date('2026-10-06T14:59:59Z')), '2026-10-06');
});

test('corrupt storage is never silently reset', () => {
  const store = makeStore(); writeFileSync(store.path, '{bad');
  assert.throws(() => new Store(store.path), UserError);
  assert.equal(readFileSync(store.path, 'utf8'), '{bad');
});

test('glossary matches abbreviations as words, including next to Korean', () => {
  const entries = loadGlossary(glossaryPath);
  assert(relevantTerms(entries, 'QA로 교대').some(e => e.id === 'combat:quick-assist'));
  assert(!relevantTerms(entries, 'Qatar').some(e => e.id === 'combat:quick-assist'));
  assert(relevantTerms(entries, 'EBA 이후 평꾹').some(e => e.id === 'enhanced-basic-attack'));
});

test('flat stat shorthand is found with attached counts without weakening other word boundaries', () => {
  const entries = loadGlossary(glossaryPath);
  for (const text of ['3fpen 4fatk', '6FPEN 10FATK', '3 fpen 4 fatk']) {
    const found = relevantTerms(entries, text);
    assert(found.some(e => e.id === 'stat-flat-atk' && e.communityPreferred.ko === '깡공'));
    assert(found.some(e => e.id === 'stat-flat-pen' && e.communityPreferred.ko === '깡관'));
  }
  for (const text of ['my3fpen', '4fpenalty', 'af atk', 'x4fatk', '14AM', '2Qatar']) {
    assert(!relevantTerms(entries, text).some(e => ['stat-flat-atk', 'stat-flat-pen'].includes(e.id)), text);
  }
  assert(!relevantTerms(entries, '14AM').some(e => e.id === 'stat:33000'));
});

test('translator batches targets, sends only relevant terms, disables storage and records usage', async () => {
  const store = makeStore(); let body; let calls = 0;
  const translator = new Translator(config, store, glossaryPath, async (url, init) => {
    calls++; body = JSON.parse(init.body);
    assert.equal(url, 'https://api.openai.com/v1/responses');
    return { ok: true, async json() { return { status: 'completed', usage: { input_tokens: 120, output_tokens: 30 }, output: [{ content: [{ type: 'output_text', text: JSON.stringify({ en: 'Quick Assist', ja: 'クイック支援', 'zh-CN': '快速支援' }) }] }] }; } };
  });
  const result = await translator.translate({ text: 'QA', sourceLanguage: 'ko', targets: ['en', 'ja', 'zh-CN'] });
  assert.equal(calls, 1); assert.equal(result.en, 'Quick Assist'); assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema.required, ['en', 'ja', 'zh-CN']);
  const input = JSON.parse(body.input);
  assert.equal(input.glossary.length, 1);
  assert.equal(input.glossary[0].sources, undefined);
  assert.deepEqual(store.usage(), { requests: 1, inputTokens: 120, outputTokens: 30 });
});

test('API failure is counted, not retried, and never exposes provider error contents', async () => {
  const store = makeStore(); let calls = 0;
  const translator = new Translator(config, store, glossaryPath, async () => { calls++; return { ok: false, status: 401, text: async () => 'SECRET' }; });
  await assert.rejects(() => translator.translate({ text: 'hello', sourceLanguage: 'en', targets: ['ko'] }), error => error.message.includes('401') && !error.message.includes('SECRET'));
  assert.equal(calls, 1); assert.equal(store.usage().requests, 1);
});

test('short ambiguous messages send both meanings and reply context in one request', async () => {
  let body; let calls = 0;
  const translator = new Translator(config, makeStore(), glossaryPath, async (url, init) => {
    calls++; body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"ko":"DA"}' }] }] }) };
  });
  const reply = { text: 'Which mode did you get 9 stars in?', language: 'en' };
  const result = await translator.translate({ text: 'DA', sourceLanguage: 'en', targets: ['ko'], reply });
  const payload = JSON.parse(body.input);
  assert.equal(calls, 1);
  assert.equal(payload.message.text, 'DA');
  assert.deepEqual(payload.reply, reply);
  assert(payload.glossary.some(e => e.id === 'combat:dash-attack'));
  assert(payload.glossary.some(e => e.id === 'mode:deadly-assault'));
  assert.equal(result.ko, 'DA');
});

test('malformed, refused and incomplete AI results are not published', async () => {
  for (const data of [
    { status: 'incomplete', usage: { output_tokens: 3000 } },
    { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'no' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"en":"wrong target"}' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'null' }] }] },
  ]) {
    const translator = new Translator(config, makeStore(), glossaryPath, async () => ({ ok: true, json: async () => data }));
    await assert.rejects(() => translator.translate({ text: 'QA', sourceLanguage: 'en', targets: ['ko'] }), UserError);
  }
});

test('zero budget blocks API without a request', async () => {
  const translator = new Translator({ ...config, dailyLimit: 0 }, makeStore(), glossaryPath, async () => assert.fail('no API call allowed'));
  await assert.rejects(() => translator.translate({ text: 'hi', sourceLanguage: 'en', targets: ['ko'] }), UserError);
});

test('four channels use one translation call and three copies; identity, no pings, no loops', async () => {
  const h = harness(); linkFour(h.store);
  const m = message(); await h.relay.handle(m);
  assert.equal(h.prompts.length, 1); assert.equal(h.calls.length, 3);
  assert.deepEqual(h.prompts[0].targets, ['en', 'ja', 'zh-CN']);
  assert(h.calls.every(c => c.target.id !== 'kr' && c.payload.username === '민수 · 번역'));
  assert.deepEqual(h.calls[0].payload.allowedMentions.parse, []);
  assert.equal(h.calls[0].payload.avatarURL, 'https://example.com/avatar.png');
  await h.relay.handle(m);
  await h.relay.handle({ ...message('bot'), author: { bot: true } });
  await h.relay.handle({ ...message('hook'), webhookId: 'h' });
  await h.relay.handle({ ...message('other'), guildId: 'other' });
  assert.equal(h.prompts.length, 1);
  const disk = readFileSync(h.store.path, 'utf8');
  assert(!disk.includes('빠른 지원')); assert(!disk.includes('avatar.png'));
});

test('only connected languages are requested; one channel, pause and attachments use no AI', async () => {
  const h = harness();
  h.store.link('guild', 'friends', 'kr', 'ko', 'h1');
  await h.relay.handle(message()); assert.equal(h.prompts.length, 0);
  h.store.link('guild', 'friends', 'en', 'en', 'h2');
  await h.relay.handle(message()); assert.deepEqual(h.prompts[0].targets, ['en']);
  await h.relay.handle(message('attachment', 'kr', ''));
  h.store.pause('guild', 'friends', true); await h.relay.handle(message('paused'));
  assert.equal(h.prompts.length, 1);
});

test('reply links point to the local copy and context stays within the group', async () => {
  const h = harness(); linkFour(h.store);
  await h.relay.handle(message());
  const englishCopy = h.store.record('m1').copies.en.ids[0];
  await h.relay.handle({ ...message('m2', 'en', 'then what?'), reference: { messageId: englishCopy } });
  assert.equal(h.prompts[1].reply.text, '빠른 지원을 써');
  const korea = h.calls.find(c => c.target.id === 'kr');
  assert(korea.payload.content.startsWith('↪ https://discord.com/channels/guild/kr/m1'));
  h.store.link('guild', 'separate', 'kr2', 'ko', 'h5'); h.store.link('guild', 'separate', 'en2', 'en', 'h6');
  await h.relay.handle({ ...message('private', 'kr2', '별도 대화'), reference: { messageId: 'm1' } });
  assert.equal(h.prompts[2].reply, null); assert.deepEqual(h.prompts[2].context, []);
});

test('edits update copies, deletes remove copies, and failed update can invalidate old text', async () => {
  const h = harness(); linkFour(h.store);
  await h.relay.handle(message());
  await h.relay.handle(message('m1', 'kr', '수정된 문장'), { edited: true });
  assert.equal(h.edits.length, 3); assert.equal(h.calls.length, 3);
  await h.relay.invalidate('m1'); assert(h.edits.at(-1).payload.content.includes('update failed'));
  await h.relay.remove('m1'); assert.equal(h.deletes.length, 3); assert.equal(h.store.record('m1'), undefined);
});

test('partial delivery failure does not replay messages or spend again', async () => {
  const h = harness(); linkFour(h.store);
  const original = h.transport.send;
  h.transport.send = async (target, payload) => { if (target.id === 'jp') throw new Error('no permission'); return original(target, payload); };
  await assert.rejects(() => h.relay.handle(message()), UserError);
  assert.equal(h.calls.length, 2); assert.equal(h.store.record('m1').copies.en.ids.length, 1);
  await h.relay.handle(message()); assert.equal(h.prompts.length, 1);
});

test('oversized message never reaches AI; splitting keeps surrogate pairs intact', async () => {
  const h = harness(); linkFour(h.store);
  await assert.rejects(() => h.relay.handle(message('long', 'kr', '가'.repeat(config.maxChars + 1))), UserError);
  assert.equal(h.prompts.length, 0);
  const text = 'a'.repeat(1899) + '😀'.repeat(1100);
  const chunks = splitText(text); assert.equal(chunks.join(''), text);
  assert(chunks.every(c => c.length <= 1900 && !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(c)));
});

test('queue serializes work, recovers after rejection, and bounds overload', async () => {
  const queue = new SerialQueue(2); const seen = [];
  let release; const blocker = new Promise(resolve => { release = resolve; });
  const one = queue.run(async () => { await blocker; seen.push(1); throw new Error('expected'); });
  const two = queue.run(async () => { seen.push(2); });
  await assert.rejects(queue.run(() => {}), UserError);
  release(); await assert.rejects(one); await two; assert.deepEqual(seen, [1, 2]);
});

test('non-managers cannot change bot configuration', async () => {
  await assert.rejects(() => handleCommand({ inGuild: () => true, guildId: 'guild', memberPermissions: { has: () => false } }, { config }), UserError);
  assert(PermissionFlagsBits.ManageGuild);
});

test('numeric configuration rejects invalid cost limits', () => {
  for (const daily of ['-1', 'NaN', '1.5']) assert.throws(() => settings({ DAILY_REQUEST_LIMIT: daily }, { requireSecrets: false }), UserError);
});

test('expired context is purged and disabled context is never retained', async () => {
  const h = harness(); linkFour(h.store);
  let time = 0; h.relay.now = () => time;
  await h.relay.handle(message()); assert.equal(h.relay.history.size, 1);
  time = 16 * 60 * 1000; h.relay.pruneHistory(); assert.equal(h.relay.history.size, 0);
  h.relay.config = { ...config, contextMessages: 0 };
  await h.relay.handle(message('disabled'));
  assert.equal(h.relay.context('guild:friends').length, 0);
  assert.equal(h.relay.history.get('guild:friends').length, 0);
});

test('relinking a source to another group never replays old edits there', async () => {
  const h = harness(); linkFour(h.store); await h.relay.handle(message());
  h.store.unlink('kr'); h.store.link('guild', 'new', 'kr', 'ko', 'hook-kr');
  h.store.link('guild', 'new', 'new-en', 'en', 'hook-new-en');
  await h.relay.handle(message('m1', 'kr', 'old conversation edit'), { edited: true });
  assert.equal(h.prompts.length, 1); assert.equal(h.calls.length, 3);
});

const forwardedMessage = (content, id = 'forward') => ({
  ...message(id, 'en', ''),
  reference: { type: MessageReferenceType.Forward, messageId: 'unlinked-original', channelId: 'private-source', guildId: 'other-guild' },
  messageSnapshots: new Collection([['unlinked-original', { content, author: { username: 'Original author', bot: true }, fetch: () => assert.fail('must not fetch original') }]]),
  fetchReference: () => assert.fail('must not fetch original'),
});

test('native forwards translate the shared snapshot with forwarder identity, not original author or reply', async () => {
  const h = harness(); linkFour(h.store);
  const text = 'After Lighter uses a Chain Attack, Defensive Assist or Quick Assist, gain a shield.';
  const m = forwardedMessage(text);
  await h.relay.handle(m);
  assert.equal(h.prompts.length, 1);
  assert.equal(h.prompts[0].text, text);
  assert.equal(h.prompts[0].guildId, 'guild');
  assert.equal(h.prompts[0].reply, null);
  assert.deepEqual(h.prompts[0].targets, ['ko', 'ja', 'zh-CN']);
  const korea = h.calls.find(c => c.target.id === 'kr');
  assert.equal(korea.payload.content, `↪ 전달된 글\ntranslated-ko: ${text}`);
  assert.equal(korea.payload.username, '민수 · 번역');
  assert.equal(korea.payload.avatarURL, 'https://example.com/avatar.png');
  assert.deepEqual(korea.payload.allowedMentions.parse, []);
  assert(!h.calls.some(c => /private-source|unlinked-original|other-guild|Original author/.test(JSON.stringify(c))));
  const disk = readFileSync(h.store.path, 'utf8');
  assert(!disk.includes(text)); assert(!disk.includes('private-source'));
  await h.relay.handle(m);
  await h.relay.handle({ ...forwardedMessage(text, 'bot-forward'), author: { bot: true } });
  await h.relay.handle({ ...forwardedMessage(text, 'hook-forward'), webhookId: 'hook' });
  assert.equal(h.prompts.length, 1);
  await h.relay.remove(m.id);
  assert.equal(h.deletes.length, 3);
  assert.equal(h.store.record(m.id), undefined);
});

test('forwarded snapshot gets glossary terms and a full 2000-character input stays intact', async () => {
  const h = harness(); linkFour(h.store);
  const text = ('Quick Assist\n'.repeat(154) + 'QA').slice(0, 2000);
  assert.equal(text.length, 2000);
  await h.relay.handle(forwardedMessage(text));
  assert.equal(h.prompts[0].text, text);
  assert(relevantTerms(loadGlossary(glossaryPath), h.prompts[0].text).some(e => e.id === 'combat:quick-assist'));
  const korea = h.calls.filter(c => c.target.id === 'kr');
  assert.equal(korea.length, 2);
  assert.equal(korea.map(c => c.payload.content).join(''), `↪ 전달된 글\ntranslated-ko: ${text}`);
  assert(korea.every(c => c.payload.content.length <= 1900));
});

test('forwarding a known local message is not treated as a reply; ordinary replies still use only new text', async () => {
  const h = harness(); linkFour(h.store);
  await h.relay.handle(message());
  const m = forwardedMessage('Quick Assist next');
  m.reference.messageId = 'm1';
  await h.relay.handle(m);
  assert.equal(h.prompts[1].reply, null);
  assert(h.calls.filter(c => c.target.id === 'kr').every(c => !c.payload.content.includes('discord.com/channels')));
  const reply = { ...message('reply', 'en', 'thanks'), reference: { type: MessageReferenceType.Default, messageId: 'm1' }, messageSnapshots: m.messageSnapshots };
  await h.relay.handle(reply);
  assert.equal(h.prompts[2].text, 'thanks');
  assert.equal(h.prompts[2].reply.text, '빠른 지원을 써');
});

test('empty or missing forwarded text gives an explanation; oversized and unlinked forwards use no AI', async () => {
  const h = harness(); linkFour(h.store);
  for (const m of [forwardedMessage(''), { ...forwardedMessage(''), messageSnapshots: new Collection() }, { ...forwardedMessage(''), messageSnapshots: undefined }]) {
    await assert.rejects(() => h.relay.handle(m), error => error instanceof UserError && error.message.includes('텍스트'));
  }
  await assert.rejects(() => h.relay.handle(forwardedMessage('a'.repeat(config.maxChars + 1))), UserError);
  await h.relay.handle({ ...forwardedMessage('Quick Assist'), channelId: 'unlinked' });
  await h.relay.handle({ ...forwardedMessage('Quick Assist'), guildId: 'other-guild' });
  h.store.pause('guild', 'friends', true);
  await h.relay.handle(forwardedMessage('Quick Assist'));
  assert.equal(h.prompts.length, 0); assert.equal(h.calls.length, 0);
});

const imageFile = { id: 'image-1', name: 'SPOILER_cat.png', contentType: 'image/png', size: 10, url: 'https://cdn.discordapp.com/attachments/source/image/cat.png' };

test('image-only messages and forwarded images are shared without an AI call, and removed with their source', async () => {
  const h = harness(); linkFour(h.store);
  const m = { ...message('image', 'kr', ''), attachments: new Collection([[imageFile.id, imageFile]]) };
  await h.relay.handle(m);
  assert.equal(h.prompts.length, 0); assert.equal(h.downloads.length, 1); assert.equal(h.calls.length, 3);
  assert(h.calls.every(c => c.payload.content === '' && c.payload.files[0].name === 'SPOILER_cat.png' && c.payload.username === '민수 · 공유'));
  assert(h.calls.every(c => c.payload.flags === 0));
  assert.equal(h.relay.history.size, 1); // Empty context lookup is harmless; no image content is remembered.
  assert.equal(h.relay.history.get('guild:friends').length, 0);
  const forward = forwardedMessage('', 'forward-image');
  forward.messageSnapshots.first().attachments = m.attachments;
  await h.relay.handle(forward);
  assert.equal(h.prompts.length, 0); assert.equal(h.downloads.length, 2);
  assert(h.calls.find(c => c.target.id === 'kr').payload.content.startsWith('↪ 전달된 글'));
  assert(!readFileSync(h.store.path, 'utf8').includes(imageFile.url));
  await h.relay.remove('image'); assert.equal(h.deletes.length, 3);
  await h.relay.handle({ ...m, id: 'unlinked-image', channelId: 'other' });
  assert.equal(h.downloads.length, 2);
});

test('media links bypass translation unchanged, keep previews enabled and respect source suppression on edit', async () => {
  const h = harness(); linkFour(h.store);
  const url = 'https://gif.fxtwitter.com/tweet_video/sample.webp';
  const m = message('media-link', 'en', `${url} 😂`);
  await h.relay.handle(m);
  assert.equal(h.prompts.length, 0);
  assert.equal(h.downloads.length, 0);
  assert(h.calls.every(c => c.payload.content === `${url} 😂` && c.payload.flags === 0 && c.payload.username === '민수 · 공유'));
  await h.relay.handle({ ...m, flags: new MessageFlagsBitField(MessageFlags.SuppressEmbeds) }, { edited: true });
  assert(h.edits.every(c => c.payload.flags === MessageFlags.SuppressEmbeds));
  await h.relay.handle({ ...m, flags: new MessageFlagsBitField(0) }, { edited: true });
  assert(h.edits.slice(-3).every(c => c.payload.flags === 0));
  await h.relay.handle(message('caption-link', 'en', `look at this ${url}`));
  assert.equal(h.prompts.length, 1);
  const forward = forwardedMessage(url, 'forward-link');
  await h.relay.handle(forward);
  assert.equal(h.prompts.length, 1);
  assert(h.calls.slice(-3).every(c => c.payload.content.endsWith(url) && c.payload.flags === 0));
});

test('image captions translate once; uploads appear only on first chunks and edits explicitly replace/remove attachments', async () => {
  const h = harness(); linkFour(h.store);
  const m = { ...message('caption', 'kr', '빠른 지원을 써'), attachments: new Collection([[imageFile.id, imageFile]]) };
  await h.relay.handle(m);
  assert.equal(h.prompts.length, 1); assert.equal(h.downloads.length, 1);
  assert(!JSON.stringify(h.prompts).includes(imageFile.url));
  assert(h.calls.every(c => c.payload.files.length === 1));
  await h.relay.handle({ ...m, content: '수정한 설명' }, { edited: true });
  assert.equal(h.edits.length, 3); assert(h.edits.every(e => e.payload.files.length === 1 && e.payload.attachments.length === 0));
  await h.relay.handle({ ...m, attachments: new Collection() }, { edited: true });
  assert(h.edits.slice(-3).every(e => !e.payload.files && e.payload.attachments.length === 0));
  const long = { ...m, id: 'long-caption', content: '가'.repeat(2000) };
  await h.relay.handle(long);
  for (const target of ['en', 'jp', 'cn']) {
    const sent = h.calls.filter(c => c.target.id === target).slice(-2);
    assert(sent[0].payload.files); assert.equal(sent[1].payload.files, undefined);
  }
});

test('Unicode and custom emoji-only messages bypass AI while ordinary clean mentions keep emoji markup', async () => {
  const h = harness(); linkFour(h.store);
  const examples = ['😂 👍', '🇰🇷', '👨‍👩‍👧‍👦', '1️⃣', '<:cat:123456789012345678> <a:dance:123456789012345679>'];
  for (const [i, text] of examples.entries()) await h.relay.handle(message(`emoji-${i}`, 'kr', text));
  assert.equal(h.prompts.length, 0); assert.equal(h.downloads.length, 0);
  assert.equal(h.calls.length, examples.length * 3);
  for (const [i, text] of examples.entries()) assert.equal(h.calls[i * 3].payload.content, text);
  const channel = { guild: { members: { cache: new Map([['123456789012345670', { displayName: '친구' }]]) }, roles: { cache: new Map() } }, client: { users: { cache: new Map() }, channels: { cache: new Map() } } };
  assert.equal(messageText({ channel, content: '<@123456789012345670> 안녕 <:cat:123456789012345678>' }), '@친구 안녕 <:cat:123456789012345678>');
});
