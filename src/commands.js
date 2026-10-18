import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { LANGUAGES } from './config.js';

const groupOption = option => option.setName('group').setDescription('같이 대화할 그룹 이름 (예: friends)').setRequired(true).setMaxLength(24);
export const command = new SlashCommandBuilder()
  .setName('zzz').setDescription('젠레스 채팅 번역 설정')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(c => c.setName('connect').setDescription('개인 PC·서버의 번역 프로그램 연결 코드 발급'))
  .addSubcommand(c => c.setName('disconnect').setDescription('개인 번역 프로그램 연결 해제'))
  .addSubcommand(c => c.setName('api-set').setDescription('이 서버의 번역 API 키·모델·사용 한도 등록 또는 변경')
    .addStringOption(o => o.setName('provider').setDescription('사용할 번역 서비스').setRequired(true)
      .addChoices({ name: 'Gemini (무료 여부는 API 계정에 따름)', value: 'gemini' }, { name: 'OpenAI (유료 API)', value: 'openai' })))
  .addSubcommand(c => c.setName('api-status').setDescription('이 서버의 API 설정 확인 (키는 표시하지 않음)'))
  .addSubcommand(c => c.setName('api-delete').setDescription('이 서버의 API 키 삭제와 번역 중지'))
  .addSubcommand(c => c.setName('link').setDescription('대화 그룹에 언어별 채널 연결')
    .addStringOption(groupOption)
    .addChannelOption(o => o.setName('channel').setDescription('번역에 사용할 텍스트 채널').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(o => o.setName('language').setDescription('이 채널에서 읽고 쓸 언어').setRequired(true).addChoices(...Object.entries(LANGUAGES).map(([value, name]) => ({ name, value })))))
  .addSubcommand(c => c.setName('unlink').setDescription('채널 연결 해제 (채널과 기존 메시지는 유지)')
    .addChannelOption(o => o.setName('channel').setDescription('연결을 해제할 채널').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(c => c.setName('pause').setDescription('대화 그룹의 번역 일시 중지').addStringOption(groupOption))
  .addSubcommand(c => c.setName('resume').setDescription('대화 그룹의 번역 다시 시작').addStringOption(groupOption))
  .addSubcommand(c => c.setName('status').setDescription('연결된 채널과 번역 상태 확인'))
  .addSubcommand(c => c.setName('usage').setDescription('서울 시간 기준 오늘의 AI 요청·토큰 사용량 확인'));
