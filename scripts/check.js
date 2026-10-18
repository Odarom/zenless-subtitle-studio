import { resolve } from 'node:path';
import { settings } from '../src/config.js';
import { loadGlossary } from '../src/translator.js';
import { command } from '../src/commands.js';

let failed = false;
try {
  const config = settings(process.env, { requireTranslation: false });
  console.log('✓ Discord 연결 설정 입력됨. 서버별 API 키는 /zzz api-set으로 입력할 수 있습니다.');
  if (config.guildId) console.log(`✓ 운영자 서버의 .env 기본 방식: ${config.provider} / ${config.model}`);
}
catch (error) { console.log(`설정 필요: ${error.message}`); failed = true; }
try {
  const glossary = loadGlossary(resolve('glossary/zzz.json'));
  console.log(`✓ 용어집 ${glossary.length}개 항목 읽기 완료`);
  console.log(`✓ Discord 명령 ${command.toJSON().options.length}개 형식 확인`);
} catch (error) { console.log(`오류: ${error.message}`); failed = true; }
process.exitCode = failed ? 1 : 0;
