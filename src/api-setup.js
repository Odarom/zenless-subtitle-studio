import { randomBytes } from 'node:crypto';
import { LabelBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { API_MODELS, validateApiSettings } from './vault.js';
import { modelPresetOptions, resolveModelChoice } from './model-presets.js';
import { UserError } from './config.js';

export function requireManager(interaction) {
  if (!interaction.inGuild()) throw new UserError('서버 안에서 사용하세요.');
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new UserError('서버 관리 권한이 필요합니다.');
}

export class ApiSetup {
  constructor(vault, config, now = Date.now) { Object.assign(this, { vault, config, now }); this.pending = new Map(); this.revisions = new Map(); }
  prune() { for (const [id, item] of this.pending) if (this.now() >= item.expires) this.pending.delete(id); }
  revision(guildId) { return this.revisions.get(guildId) || 0; }
  cancelGuild(guildId) {
    this.revisions.set(guildId, this.revision(guildId) + 1);
    for (const [id, item] of this.pending) if (item.guildId === guildId) this.pending.delete(id);
  }
  async open(interaction) {
    requireManager(interaction);
    this.prune();
    const provider = interaction.options.getString('provider', true);
    if (!Object.hasOwn(API_MODELS, provider)) throw new UserError('Gemini 또는 OpenAI를 선택하세요.');
    const saved = this.vault.get(interaction.guildId);
    const current = saved?.provider === provider ? saved : undefined;
    const model = current?.model ?? API_MODELS[provider];
    const options = modelPresetOptions(provider, model);
    const custom = options.find(option => option.value === 'custom').default;
    for (const [id, item] of this.pending) if (item.guildId === interaction.guildId && item.userId === interaction.user.id) this.pending.delete(id);
    if (this.pending.size >= 1000) throw new UserError('설정 요청이 많습니다. 잠시 후 다시 시도하세요.');
    const nonce = randomBytes(16).toString('hex');
    this.pending.set(nonce, { guildId: interaction.guildId, userId: interaction.user.id, provider, revision: this.revision(interaction.guildId), expires: this.now() + 10 * 60 * 1000 });
    const input = (id, label, description, max, { value, required = true, placeholder } = {}) => {
      const field = new TextInputBuilder().setCustomId(id).setStyle(TextInputStyle.Short).setRequired(required).setMaxLength(max);
      if (value !== undefined) field.setValue(value);
      if (placeholder) field.setPlaceholder(placeholder);
      return new LabelBuilder().setLabel(label).setDescription(description).setTextInputComponent(field);
    };
    const select = new StringSelectMenuBuilder().setCustomId('model-preset').setRequired(true)
      .setMinValues(1).setMaxValues(1).addOptions(options);
    const modal = new ModalBuilder().setCustomId(`zzz:api:${nonce}`).setTitle(`${provider === 'gemini' ? 'Gemini' : 'OpenAI'} · 이 서버 API 설정`).addLabelComponents(
      new LabelBuilder().setLabel('모델 선택').setDescription('무료 여부·요금·사용 한도는 API 프로젝트 설정에 따릅니다.').setStringSelectMenuComponent(select),
      input('model', '직접 입력할 모델 이름', '위에서 「직접 입력」을 선택했을 때만 사용합니다.', 80,
        { required: false, value: custom ? model : undefined, placeholder: `예: ${API_MODELS[provider]}` }),
      input('key', 'API 키', current ? '비워 두면 이 서버에 저장된 키를 유지합니다. 입력 글자는 가려지지 않습니다.' : '현재 서비스의 API 키를 입력하세요. 입력 글자는 가려지지 않습니다.', 512,
        { required: !current }),
      input('limit', '하루 최대 요청 횟수', '0은 번역 중지. API 제공사의 한도·금액 한도와는 별도입니다.', 6,
        { value: String(saved?.dailyLimit ?? this.config.dailyLimit) }),
    );
    try { await interaction.showModal(modal); }
    catch { this.pending.delete(nonce); throw new UserError('입력 창을 열지 못했습니다. 다시 실행하세요.'); }
  }
  take(interaction) {
    requireManager(interaction); // Check again: roles may have changed since opening.
    this.prune();
    const nonce = interaction.customId.slice('zzz:api:'.length);
    const session = this.pending.get(nonce);
    if (!session || session.guildId !== interaction.guildId || session.userId !== interaction.user.id) throw new UserError('입력 창이 만료되었거나 본인의 요청이 아닙니다. /zzz api-set을 다시 실행하세요.');
    this.pending.delete(nonce);
    const limit = interaction.fields.getTextInputValue('limit').trim();
    if (!/^\d{1,6}$/.test(limit)) throw new UserError('하루 요청 한도에는 0~100000 사이 정수를 입력하세요.');
    const selected = interaction.fields.getStringSelectValues('model-preset');
    if (!Array.isArray(selected) || selected.length !== 1) throw new UserError('모델은 하나만 선택하세요.');
    const model = resolveModelChoice(session.provider, selected[0], interaction.fields.getTextInputValue('model'));
    let apiKey = interaction.fields.getTextInputValue('key').trim();
    if (!apiKey) {
      const saved = this.vault.get(session.guildId);
      if (saved?.provider !== session.provider) throw new UserError('선택한 서비스의 API 키를 입력하세요. 다른 서비스의 키는 사용할 수 없습니다.');
      apiKey = saved.apiKey;
    }
    const value = validateApiSettings({
      provider: session.provider, apiKey, model, dailyLimit: Number(limit),
    });
    return { guildId: session.guildId, revision: session.revision, value };
  }
}

export async function respondToApi(interaction, { apiSetup, relay, store }, queue) {
  const opening = interaction.isChatInputCommand?.() && interaction.commandName === 'zzz' && interaction.options.getSubcommand() === 'api-set';
  const submitting = interaction.isModalSubmit?.() && interaction.customId.startsWith('zzz:api:');
  if (!opening && !submitting) return false;
  try {
    if (opening) await apiSetup.open(interaction);
    else {
      const { guildId, revision, value } = apiSetup.take(interaction);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await queue.run(() => {
        requireManager(interaction);
        if (apiSetup.revision(guildId) !== revision) throw new UserError('입력 중 서버 API 설정이 변경되었습니다. /zzz api-set을 다시 실행하세요.');
        apiSetup.vault.set(guildId, value);
        apiSetup.cancelGuild(guildId);
        for (const group of store.groups(guildId)) relay.forgetGroup(group.key);
      });
      await interaction.editReply({ content: `이 서버의 ${value.provider} API 설정을 저장했습니다.\n모델: ${value.model} / 하루 최대 ${value.dailyLimit}회\n키는 다시 표시하지 않습니다. 다음 번역부터 적용됩니다.\n실제 연결과 무료 한도는 아직 검증하지 않았습니다. 무료 여부·요금은 해당 API 계정 설정에 따릅니다.`, allowedMentions: { parse: [] } });
    }
  } catch (error) {
    // Never log an interaction, submitted fields, request body or SDK error object.
    const content = error instanceof UserError ? error.message : 'API 설정을 저장하지 못했습니다. 봇 운영자에게 확인하세요. 키를 채팅에 보내지 마세요.';
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content, allowedMentions: { parse: [] } });
    else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  }
  return true;
}
