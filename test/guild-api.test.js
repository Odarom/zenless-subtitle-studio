import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComponentType, MessageFlags, ModalSubmitFields } from 'discord.js';
import { GuildVault } from '../src/vault.js';
import { Store } from '../src/store.js';
import { settings, UserError } from '../src/config.js';
import { GuildTranslator } from '../src/guild-translator.js';
import { ApiSetup, respondToApi } from '../src/api-setup.js';
import { handleCommand } from '../src/discord.js';
import { Relay, SerialQueue } from '../src/relay.js';
import { command } from '../src/commands.js';

const A = '111111111111111111', B = '222222222222222222';
const first = { provider: 'gemini', model: 'gemini-3-flash-preview', apiKey: 'AIza-server-A-secret-example', dailyLimit: 1 };
const second = { provider: 'openai', model: 'gpt-4.1-mini', apiKey: 'sk-server-B-secret-example', dailyLimit: 2 };
const glossary = new URL('../glossary/zzz.json', import.meta.url);
const base = { ...settings({}, { requireSecrets: false }), guildId: A };
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'zzz-tenant-'));
  const path = join(dir, 'vault.json'), keyPath = join(dir, 'private', 'key');
  return { dir, path, keyPath, vault: new GuildVault(path, keyPath), store: new Store(join(dir, 'state.json')) };
}
const admin = (guildId = A) => ({ inGuild: () => true, guildId, user: { id: 'user' }, memberPermissions: { has: () => true } });
const openInteraction = (guildId = A, provider = 'gemini') => ({ ...admin(guildId), isChatInputCommand: () => true, commandName: 'zzz', options: { getSubcommand: () => 'api-set', getString: () => provider }, async showModal(modal) { this.modal = modal.toJSON(); } });
const modalField = (modal, id) => modal.components.map(label => label.component).find(field => field.custom_id === id);
function submitInteraction(open, value = first, selected = 'custom') {
  const values = { key: value.apiKey, model: value.model, limit: String(value.dailyLimit) };
  const fields = new ModalSubmitFields([
    { type: ComponentType.Label, component: { type: ComponentType.StringSelect, customId: 'model-preset', values: Array.isArray(selected) ? selected : [selected] } },
    ...Object.entries(values).map(([customId, value]) => ({ type: ComponentType.Label, component: { type: ComponentType.TextInput, customId, value } })),
  ]);
  return { ...admin(open.guildId), customId: open.modal.custom_id, isModalSubmit: () => true,
    fields,
    responses: [], async deferReply(options) { this.deferred = true; this.responses.push(options); },
    async reply(options) { this.replied = true; this.responses.push(options); },
    async editReply(options) { this.responses.push(options); },
  };
}

test('guild keys survive restart encrypted, and ciphertext is bound to a guild', () => {
  const h = setup(); h.vault.set(A, first); h.vault.set(B, second);
  const bytes = readFileSync(h.path, 'utf8');
  assert(!bytes.includes(first.apiKey)); assert(!bytes.includes(second.apiKey));
  const restored = new GuildVault(h.path, h.keyPath);
  assert.deepEqual(restored.get(A), first); assert.deepEqual(restored.get(B), second);
  const tampered = JSON.parse(bytes); tampered.guilds[B] = tampered.guilds[A];
  writeFileSync(h.path, JSON.stringify(tampered));
  const bad = new GuildVault(h.path, h.keyPath);
  assert.throws(() => bad.get(B), UserError);
  assert.deepEqual(bad.get(A), first);
});

test('missing master key and corrupt vault never silently reset saved credentials', () => {
  const h = setup(); h.vault.set(A, first); const bytes = readFileSync(h.path, 'utf8');
  unlinkSync(h.keyPath);
  assert.throws(() => new GuildVault(h.path, h.keyPath), UserError);
  assert.equal(readFileSync(h.path, 'utf8'), bytes);
  writeFileSync(h.path, 'broken');
  assert.throws(() => new GuildVault(h.path, h.keyPath), UserError);
  assert.equal(readFileSync(h.path, 'utf8'), 'broken');
});

test('two guilds use only their own provider/key, separate persisted quota, no fallback', async () => {
  const h = setup(); h.vault.set(A, first); h.vault.set(B, second);
  const seen = [];
  const translator = new GuildTranslator({ ...base, apiKey: 'never-use-owner-key' }, h.store, h.vault, glossary, async (url, init) => {
    if (url.includes('googleapis')) {
      assert.equal(init.headers['x-goog-api-key'], first.apiKey); seen.push(A);
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"ko":"안녕"}' }] } }], usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 2 } }) };
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(init.headers.Authorization, `Bearer ${second.apiKey}`); seen.push(B);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"ko":"안녕"}' }] }], usage: { input_tokens: 5, output_tokens: 1 } }) };
  });
  const translate = guildId => translator.translate({ guildId, text: 'hi', sourceLanguage: 'en', targets: ['ko'] });
  await Promise.all([translate(A), translate(B)]);
  await assert.rejects(async () => translate(A), /한도/);
  await translate(B);
  assert.deepEqual(seen, [A, B, B]);
  const restarted = new Store(h.store.path);
  assert.deepEqual(restarted.scoped(A).usage(), { requests: 1, inputTokens: 11, outputTokens: 2 });
  assert.deepEqual(restarted.scoped(B).usage(), { requests: 2, inputTokens: 10, outputTokens: 2 });
  h.vault.delete(A);
  assert.throws(() => translator.resolve(A), /설정되지/);
  assert.equal(translator.resolve(B).apiKey, second.apiKey);
  assert(!JSON.stringify(translator.status(B)).includes(second.apiKey));
  assert.throws(() => translator.resolve('333333333333333333'), /설정되지/);
});

test('legacy env key/local AI is limited to the named owner guild; deleting it blocks fallback', () => {
  const h = setup();
  for (const provider of ['ollama', 'gemini']) {
    const t = new GuildTranslator({ ...base, provider, apiKey: 'owner-key' }, h.store, h.vault, glossary);
    assert.equal(t.resolve(A).provider, provider);
    assert.throws(() => t.resolve(B), UserError);
  }
  h.vault.delete(A);
  const t = new GuildTranslator(base, h.store, h.vault, glossary);
  assert.throws(() => t.resolve(A), UserError);
});

test('legacy daily usage migrates once to owner without affecting other guilds', () => {
  const h = setup(); h.store.reserve(4, '2026-10-07'); h.store.recordUsage('2026-10-07', { input_tokens: 10, output_tokens: 4 });
  h.store.migrateLegacyUsage(A); h.store.migrateLegacyUsage(A);
  assert.deepEqual(h.store.scoped(A).usage('2026-10-07'), { requests: 1, inputTokens: 10, outputTokens: 4 });
  assert.equal(h.store.scoped(B).usage('2026-10-07').requests, 0);
});

test('modal key entry is private, never prefilled, one-time and immediately persists only this guild', async () => {
  const h = setup(); h.vault.set(B, second);
  const apiSetup = new ApiSetup(h.vault, base), relay = { forgetGroup() {} };
  const deps = { apiSetup, relay, store: h.store };
  const opening = { ...openInteraction(), responses: [], async reply(value) { this.responses.push(value); } };
  assert.equal(await respondToApi(opening, deps, new SerialQueue()), true);
  assert.equal(modalField(opening.modal, 'key').value, undefined);
  assert(opening.modal.components.some(label => label.description?.includes('운영자가 복호화할 수 있습니다')));
  const submit = submitInteraction(opening);
  await respondToApi(submit, deps, new SerialQueue());
  assert.equal(submit.responses[0].flags, MessageFlags.Ephemeral);
  assert(!JSON.stringify(submit.responses).includes(first.apiKey));
  assert.deepEqual(h.vault.get(A), first); assert.deepEqual(h.vault.get(B), second);
  assert.throws(() => apiSetup.take(submitInteraction(opening)), UserError);
});

test('model lists belong to the selected provider and a new server defaults to Flash-Lite', async () => {
  const h = setup(); const ui = new ApiSetup(h.vault, base);
  for (const provider of ['gemini', 'openai']) {
    const open = openInteraction(A, provider); await ui.open(open);
    const select = modalField(open.modal, 'model-preset');
    assert.equal(select.type, ComponentType.StringSelect);
    assert.equal(select.options.filter(option => option.default).length, 1);
    assert.equal(select.options.find(option => option.default).value, provider === 'gemini' ? 'gemini-3.1-flash-lite' : 'gpt-4.1-mini');
    assert(select.options.some(option => option.value === 'custom'));
    assert(select.options.filter(option => option.value !== 'custom').every(option => option.value.startsWith(provider === 'gemini' ? 'gemini-' : 'gpt-')));
    assert(!select.options.some(option => /live|audio|tts|image/.test(option.value)));
    assert.equal(modalField(open.modal, 'model').required, false);
    assert.equal(modalField(open.modal, 'key').required, true);
    assert(!JSON.stringify(open.modal).includes(first.apiKey));
  }
  assert.equal(h.vault.has(A), false);
});

test('selecting a preset changes only the model and keeps an existing key without re-entry', async () => {
  const h = setup(); h.vault.set(A, first); h.vault.set(B, second);
  const ui = new ApiSetup(h.vault, base), open = openInteraction(); await ui.open(open);
  assert.equal(modalField(open.modal, 'model-preset').options.find(option => option.default).value, first.model);
  assert.equal(modalField(open.modal, 'limit').value, String(first.dailyLimit));
  assert.equal(modalField(open.modal, 'key').required, false);
  assert.equal(modalField(open.modal, 'key').value, undefined);
  const submit = submitInteraction(open, { ...first, apiKey: '', model: 'ignored-custom-field' }, 'gemini-3.1-flash-lite');
  await respondToApi(submit, { apiSetup: ui, store: h.store, relay: { forgetGroup() {} } }, new SerialQueue());
  assert.deepEqual(h.vault.get(A), { ...first, model: 'gemini-3.1-flash-lite' });
  assert.deepEqual(h.vault.get(B), second);
  assert(!JSON.stringify(submit.responses).includes(first.apiKey));
  assert.equal(h.store.scoped(A).usage().requests, 0);
});

test('custom models remain editable and unknown saved models are prefilled without resetting limits', async () => {
  const h = setup(); const custom = { ...first, model: 'gemini-3.8-flash', dailyLimit: 77 };
  h.vault.set(A, custom);
  const ui = new ApiSetup(h.vault, base), open = openInteraction(); await ui.open(open);
  assert.equal(modalField(open.modal, 'model-preset').options.find(option => option.default).value, 'custom');
  assert.equal(modalField(open.modal, 'model').value, custom.model);
  assert.equal(modalField(open.modal, 'limit').value, '77');
  const submit = submitInteraction(open, { ...custom, apiKey: '', model: 'gemini-3.5-flash' });
  await respondToApi(submit, { apiSetup: ui, store: h.store, relay: { forgetGroup() {} } }, new SerialQueue());
  assert.deepEqual(h.vault.get(A), { ...custom, model: 'gemini-3.5-flash' });
});

test('empty custom models, forged presets and multiple selections leave saved settings intact', async () => {
  const h = setup(); h.vault.set(A, first);
  const ui = new ApiSetup(h.vault, base), deps = { apiSetup: ui, store: h.store, relay: { forgetGroup() {} } };
  for (const selected of ['custom', 'gpt-4.1-mini', 'gemini-unlisted', ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']]) {
    const open = openInteraction(); await ui.open(open);
    const submit = submitInteraction(open, { ...first, apiKey: '', model: '' }, selected);
    await respondToApi(submit, deps, new SerialQueue());
    assert.deepEqual(h.vault.get(A), first);
    assert(!JSON.stringify(submit.responses).includes(first.apiKey));
    assert.equal(submit.responses[0].flags, MessageFlags.Ephemeral);
  }
});

test('blank keys cannot reuse another provider or revive a deleted server credential', async () => {
  const h = setup(); h.vault.set(A, first);
  const ui = new ApiSetup(h.vault, base), deps = { apiSetup: ui, store: h.store, relay: { forgetGroup() {} } };
  const open = openInteraction(A, 'openai'); await ui.open(open);
  assert.equal(modalField(open.modal, 'key').required, true);
  assert.equal(modalField(open.modal, 'limit').value, String(first.dailyLimit));
  const submit = submitInteraction(open, { ...second, apiKey: '', model: '' }, 'gpt-4.1-mini');
  await respondToApi(submit, deps, new SerialQueue());
  assert.deepEqual(h.vault.get(A), first);
  h.vault.delete(A); ui.cancelGuild(A);
  const deletedOpen = openInteraction(); await ui.open(deletedOpen);
  assert.equal(modalField(deletedOpen.modal, 'key').required, true);
  const deletedSubmit = submitInteraction(deletedOpen, { ...first, apiKey: '', model: '' }, 'gemini-3.1-flash-lite');
  await respondToApi(deletedSubmit, deps, new SerialQueue());
  assert.equal(h.vault.get(A), null);
});

test('modal rejects non-admin, another guild/user, expired session and revoked permissions', async () => {
  const h = setup(); let now = 0;
  const ui = new ApiSetup(h.vault, base, () => now);
  const noAdmin = { ...openInteraction(), memberPermissions: { has: () => false } };
  await assert.rejects(() => ui.open(noAdmin), /권한/);
  const open = openInteraction(); await ui.open(open);
  for (const overrides of [{ guildId: B }, { user: { id: 'other' } }, { memberPermissions: { has: () => false } }, { inGuild: () => false }]) {
    assert.throws(() => ui.take({ ...submitInteraction(open), ...overrides }), UserError);
  }
  now = 600001;
  assert.throws(() => ui.take(submitInteraction(open)), /만료/);
  assert.equal(h.vault.has(A), false);
});

test('invalid submissions keep old key and do not echo submitted secrets', async () => {
  const h = setup(); h.vault.set(A, first);
  const ui = new ApiSetup(h.vault, base);
  const deps = { apiSetup: ui, store: h.store, relay: { forgetGroup() {} } };
  for (const changes of [{ model: first.apiKey }, { apiKey: 'bad key with spaces' }, { dailyLimit: -1 }]) {
    const opening = openInteraction(); await ui.open(opening);
    const submit = submitInteraction(opening, { ...first, ...changes });
    await respondToApi(submit, deps, new SerialQueue());
    assert.deepEqual(h.vault.get(A), first);
    assert(!JSON.stringify(submit.responses).includes(first.apiKey));
    assert.equal(submit.responses[0].flags, MessageFlags.Ephemeral);
  }
});

test('delete clears key, cancels old modals, preserves other guild; status never exposes key', async () => {
  const h = setup(); h.vault.set(A, first); h.vault.set(B, second);
  const apiSetup = new ApiSetup(h.vault, base), opening = openInteraction(); await apiSetup.open(opening);
  const translator = new GuildTranslator(base, h.store, h.vault, glossary);
  const deps = { ...h, apiSetup, translator, config: base, relay: { forgetGroup() {} } };
  const invoke = sub => handleCommand({ ...admin(), options: { getSubcommand: () => sub } }, deps);
  const status = await invoke('api-status'); assert(!status.includes(first.apiKey));
  await invoke('api-delete');
  assert.equal(h.vault.get(A), null); assert.deepEqual(h.vault.get(B), second);
  assert.throws(() => apiSetup.take(submitInteraction(opening)), UserError);
  assert.throws(() => translator.resolve(A), UserError);
});

test('multi-server relay keeps channels and recent conversation isolated', async () => {
  const h = setup(); const prompts = [], sends = [];
  for (const g of [A, B]) { h.store.link(g, 'friends', `${g}-ko`, 'ko', 'hook'); h.store.link(g, 'friends', `${g}-en`, 'en', 'hook'); }
  const translator = { async translate(input) { prompts.push(input); return { en: 'hello' }; } };
  const relay = new Relay({ config: base, store: h.store, translator, transport: { async send(target) { sends.push(target.id); return { id: `sent-${sends.length}` }; } } });
  const message = g => ({ id: `${g}-message`, guildId: g, channelId: `${g}-ko`, content: '안녕하세요', author: { id: 'user', username: 'user' } });
  await relay.handle(message(A)); await relay.handle(message(B));
  assert.deepEqual(prompts.map(p => p.guildId), [A, B]); assert.deepEqual(prompts[1].context, []);
  assert.deepEqual(sends, [`${A}-en`, `${B}-en`]);
  await relay.handle({ ...message(B), id: 'forged', channelId: `${A}-ko` });
  assert.equal(prompts.length, 2);
});

test('API commands have no slash option for a raw key and registration is valid', () => {
  const json = command.toJSON();
  assert(json.options.some(o => o.name === 'connect'));
  assert(json.options.some(o => o.name === 'disconnect'));
  assert.deepEqual(json.options.find(o => o.name === 'api-set').options.map(o => o.name), ['provider']);
  assert(json.default_member_permissions);
});

test('public runner mode rejects both new key dialogs and stale modal submissions without touching the vault', async () => {
  const h = setup(), apiSetup = new ApiSetup({ get() { assert.fail('public mode must not read stored API keys'); } }, base);
  const opening = { ...openInteraction(), responses: [], async reply(value) { this.responses.push(value); } };
  await respondToApi(opening, { apiSetup, config: { apiMode: 'runner' } }, new SerialQueue());
  assert.equal(opening.modal, undefined);
  assert.match(opening.responses.at(-1).content, /API 키를 받지/);
  const stale = { ...opening, isChatInputCommand: () => false, isModalSubmit: () => true, customId: 'zzz:api:old-session' };
  await respondToApi(stale, { apiSetup, config: { apiMode: 'runner' } }, new SerialQueue());
  assert.match(stale.responses.at(-1).content, /API 키를 받지/);
});

test('queued stale modal cannot restore a key deleted while awaiting its turn', async () => {
  const h = setup(); h.vault.set(A, first);
  const apiSetup = new ApiSetup(h.vault, base), opening = openInteraction(); await apiSetup.open(opening);
  const pendingTasks = [];
  const queue = { run: task => new Promise((resolve, reject) => pendingTasks.push(async () => { try { resolve(await task()); } catch (e) { reject(e); } })) };
  const submit = submitInteraction(opening);
  const response = respondToApi(submit, { apiSetup, store: h.store, relay: { forgetGroup() {} } }, queue);
  await new Promise(resolve => setImmediate(resolve));
  h.vault.delete(A); apiSetup.cancelGuild(A);
  await pendingTasks[0](); await response;
  assert.equal(h.vault.get(A), null);
  assert(submit.responses.at(-1).content.includes('변경'));
});
