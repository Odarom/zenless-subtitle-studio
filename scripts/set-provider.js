import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const provider = process.argv[2];
if (!['ollama', 'gemini', 'openai'].includes(provider)) throw new Error('Unknown provider');
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
let content = readFileSync('.env', 'utf8');
// Preserve all other values and comments, including private credentials.
content = /^TRANSLATION_PROVIDER=.*$/m.test(content)
  ? content.replace(/^TRANSLATION_PROVIDER=.*$/gm, `TRANSLATION_PROVIDER=${provider}`)
  : content.trimEnd() + `\nTRANSLATION_PROVIDER=${provider}\n`;
writeFileSync('.env', content);
console.log(`번역 방식: ${provider}. 실행 중인 봇이 있다면 종료 후 다시 실행하세요.`);
console.log(provider === 'ollama' ? 'local-ai.cmd로 로컬 AI를 준비한 뒤 run.cmd를 실행하세요.' : provider === 'gemini' ? '.env의 GEMINI_API_KEY를 입력하세요. 무료 사용 여부는 Google AI Studio 프로젝트에서 확인하세요.' : '.env의 OPENAI_API_KEY를 입력하세요. OpenAI API 사용료가 발생합니다.');
