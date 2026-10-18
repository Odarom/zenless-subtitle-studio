import test from 'node:test';
import assert from 'node:assert/strict';
import { Collection, MessageReferenceType } from 'discord.js';
import { downloadImages, imageAttachments, imageRevision, MAX_IMAGE_BYTES } from '../src/media.js';
import { protectEmojis, hasTranslatableText } from '../src/emoji.js';
import { Translator } from '../src/translator.js';
import { settings, UserError } from '../src/config.js';

const image = { id: 'one', url: 'https://cdn.discordapp.com/attachments/1/2/image.png?ex=123', name: 'SPOILER_image.png', size: 3, contentType: 'image/png' };
const attachments = file => new Collection([[file.id, file]]);

test('image downloads are bounded, preserve spoilers and share a single buffer without credentials or disk writes', async () => {
  let calls = 0;
  const files = await downloadImages([image], async (url, init) => {
    calls++; assert.equal(url, image.url); assert.equal(init.redirect, 'error'); assert.equal(init.headers, undefined);
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-length': '3' } });
  });
  assert.equal(calls, 1); assert.equal(files[0].name, image.name); assert.deepEqual(files[0].attachment, Buffer.from([1, 2, 3]));
});

test('private/foreign URL, oversized metadata and too many images are blocked before downloads', async () => {
  const forbidden = () => assert.fail('must not fetch');
  for (const url of ['http://cdn.discordapp.com/attachments/1/2/image.png', 'https://localhost/attachments/1/2/image.png', 'https://cdn.discordapp.com.evil.test/attachments/1/2/image.png', 'https://cdn.discordapp.com/api', 'https://user:password@cdn.discordapp.com/attachments/1/2/image.png']) await assert.rejects(() => downloadImages([{ ...image, url }], forbidden), UserError);
  await assert.rejects(() => downloadImages([{ ...image, size: MAX_IMAGE_BYTES + 1 }], forbidden), UserError);
  await assert.rejects(() => downloadImages(Array(11).fill(image), forbidden), UserError);
});

test('claimed-small images cannot exceed the streamed total; failed/empty downloads never publish', async () => {
  await assert.rejects(() => downloadImages([image], async () => new Response(new Uint8Array(MAX_IMAGE_BYTES + 1))), /10MB/);
  await assert.rejects(() => downloadImages([image], async () => new Response('secret-body', { status: 403 })), error => error instanceof UserError && !error.message.includes('secret-body'));
  await assert.rejects(() => downloadImages([image], async () => new Response(new Uint8Array())), /비어/);
  await assert.rejects(() => downloadImages([image], async () => { throw new Error('secret-url'); }), error => error instanceof UserError && !error.message.includes('secret-url'));
});

test('only source images are selected; forwards use snapshots and image revisions ignore signed URL refresh', () => {
  const document = { ...image, id: 'pdf', contentType: 'application/pdf', name: 'notes.pdf' };
  const m = { attachments: new Collection([[image.id, image], [document.id, document]]) };
  assert.deepEqual(imageAttachments(m), [image]);
  const f = { reference: { type: MessageReferenceType.Forward }, attachments: attachments(document), messageSnapshots: new Collection([['original', m]]) };
  assert.deepEqual(imageAttachments(f), [image]);
  assert.equal(imageRevision(m), imageRevision({ attachments: attachments({ ...image, url: image.url + '&hm=new' }) }));
  assert.notEqual(imageRevision(m), imageRevision({ attachments: new Collection() }));
});

test('emoji protection preserves distinct custom IDs, Unicode sequences, duplicates and literal placeholder text', () => {
  const text = 'hello [[ZZZ_EMOJI_0]] <:cat:123456789012345678> <:cat:123456789012345679> 🇰🇷 👨‍👩‍👧‍👦 👍🏽 1️⃣ 😂😂';
  const protectedText = protectEmojis(text);
  assert.equal(protectedText.restore(protectedText.text), text);
  const emoji = protectEmojis('hello <:cat:123456789012345678>');
  assert.equal(emoji.restore('안녕'), '안녕 <:cat:123456789012345678>');
  assert.equal(hasTranslatableText('😂 🇰🇷 👍🏽 1️⃣ <:cat:123456789012345678>'), false);
  assert.equal(hasTranslatableText('안녕 😂'), true);
});

test('mixed text translates through the normal provider and restores original emoji before publishing', async () => {
  const config = settings({ TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' }, { requireSecrets: false });
  const store = { reserve: () => 'day', recordUsage() {} };
  const translator = new Translator(config, store, new URL('../glossary/zzz.json', import.meta.url), async (url, init) => {
    const payload = JSON.parse(JSON.parse(init.body).contents[0].parts[0].text);
    assert.equal(payload.message.text, '안녕 [[ZZZ_EMOJI_0]] [[ZZZ_EMOJI_1]]');
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ en: 'Hello [[ZZZ_EMOJI_0]] [[ZZZ_EMOJI_1]]' }) }] } }] }) };
  });
  assert.deepEqual(await translator.translate({ text: '안녕 <:cat:123456789012345678> 😂', sourceLanguage: 'ko', targets: ['en'] }), { en: 'Hello <:cat:123456789012345678> 😂' });
});
