import { REST, PermissionFlagsBits } from 'discord.js';
import { command } from './commands.js';
import { settings, UserError } from './config.js';
import { reportCommands } from './report-commands.js';
import { registerGlobalCommands } from './command-registration.js';

try {
  const config = settings(process.env, { requireTranslation: false });
  const rest = new REST({ version: '10' }).setToken(config.token);
  await registerGlobalCommands({ rest, applicationId: config.applicationId, guildId: config.guildId,
    definitions: [command, ...reportCommands] });
  const permissions = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.ReadMessageHistory | PermissionFlagsBits.ManageWebhooks;
  console.log('/zzz, /zzz-report, 오역 신고 메뉴 등록 완료. 각 서버에 사용할 초대 링크:');
  console.log(`https://discord.com/oauth2/authorize?client_id=${config.applicationId}&scope=bot%20applications.commands&permissions=${permissions}&integration_type=0`);
} catch (error) {
  console.error(error instanceof UserError ? error.message : `명령 등록 실패 (${error.code ?? error.name}). 봇 초대와 ID·토큰을 확인하세요.`);
  process.exitCode = 1;
}
