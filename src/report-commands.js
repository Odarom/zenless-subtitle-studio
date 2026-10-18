import { ApplicationCommandType, ApplicationIntegrationType, ContextMenuCommandBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';

export const REPORT_MENU_NAME = '오역 신고';
export const reportCommands = [
  new ContextMenuCommandBuilder().setName(REPORT_MENU_NAME).setType(ApplicationCommandType.Message)
    .setNameLocalizations({ 'en-US': 'Report translation', 'en-GB': 'Report translation', ja: '誤訳を報告', 'zh-CN': '举报误译' })
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall).setContexts(InteractionContextType.Guild),
  new SlashCommandBuilder().setName('zzz-report').setDescription('오역 신고 접수와 내 신고 처리 상태 확인')
    .setDescriptionLocalizations({ 'en-US': 'Report a translation and check your reports', 'en-GB': 'Report a translation and check your reports', ja: '誤訳を報告・自分の報告状況を確認', 'zh-CN': '举报误译并查看举报状态' })
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall).setContexts(InteractionContextType.Guild)
    .addSubcommand(c => c.setName('submit').setDescription('번역 메시지 링크로 오역 신고하기')
      .setDescriptionLocalizations({ 'en-US': 'Report a translation using its message link', 'en-GB': 'Report a translation using its message link', ja: 'メッセージリンクから誤訳を報告', 'zh-CN': '使用译文消息链接举报误译' })
      .addStringOption(o => o.setName('message').setDescription('신고할 봇 번역 메시지의 링크 (메시지 우클릭 → 메시지 링크 복사)')
        .setDescriptionLocalizations({ 'en-US': 'Bot translation message link (right-click → Copy Message Link)', 'en-GB': 'Bot translation message link (right-click → Copy Message Link)', ja: 'ボット訳文のリンク（右クリック → メッセージリンクをコピー）', 'zh-CN': '机器人译文的消息链接（右键 → 复制消息链接）' })
        .setRequired(true).setMaxLength(200)))
    .addSubcommand(c => c.setName('mine').setDescription('내가 접수한 최근 신고 목록')
      .setDescriptionLocalizations({ 'en-US': 'List your recent reports', 'en-GB': 'List your recent reports', ja: '自分の最近の報告一覧', 'zh-CN': '查看最近提交的举报' }))
    .addSubcommand(c => c.setName('status').setDescription('신고 번호로 처리 상태 확인')
      .setDescriptionLocalizations({ 'en-US': 'Check a report by its ID', 'en-GB': 'Check a report by its ID', ja: '報告番号から状態を確認', 'zh-CN': '使用举报编号查看状态' })
      .addStringOption(o => o.setName('id').setDescription('접수 시 받은 R-로 시작하는 신고 번호')
        .setDescriptionLocalizations({ 'en-US': 'The report ID you received, starting with R-', 'en-GB': 'The report ID you received, starting with R-', ja: '受付時に受け取ったR-から始まる報告番号', 'zh-CN': '提交时收到的以R-开头的举报编号' })
        .setRequired(true).setMaxLength(24))),
];
