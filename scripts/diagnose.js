// Read-only checks. Never print credentials or provider response bodies.
import { readFileSync } from 'node:fs';
import { settings } from '../src/config.js';
const config = settings(process.env, { requireTranslation: false });
try {
  const pid = Number(readFileSync('data/bot.lock', 'utf8'));
  try { process.kill(pid, 0); console.log('봇 실행 기록: 프로세스가 실행 중'); }
  catch (e) { console.log(e.code === 'EPERM' ? '봇 실행 기록: 접근 제한으로 상태 미확인' : '봇 실행 기록: 종료된 프로세스'); }
} catch { console.log('봇 실행 기록: 없음'); }
async function get(path) {
  try {
    const r = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: `Bot ${config.token}` }, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    return { status: r.status, data: r.ok ? await r.json() : null };
  } catch (e) { return { status: e.cause?.code || e.name, data: null }; }
}
const [user, app, guild, commands] = await Promise.all([
  get('/users/@me'), get('/oauth2/applications/@me'), get(`/guilds/${config.guildId}`),
  get(`/applications/${config.applicationId}/guilds/${config.guildId}/commands`),
]);
console.log(`Discord 토큰 확인: ${user.status === 200 ? '정상' : user.status}`);
console.log(`Application ID 일치: ${app.data ? app.data.id === config.applicationId : '조회 실패 (' + app.status + ')'}`);
console.log(`설정된 서버 접근: ${guild.status === 200 ? '정상' : guild.status}`);
if (app.data) {
  console.log(`메시지 내용 접근 설정: ${!!(app.data.flags & ((1 << 18) | (1 << 19)))}`);
  console.log(`외부 명령 수신 URL 설정: ${Boolean(app.data.interactions_endpoint_url)}`);
}
const zzz = commands.data?.find(c => c.name === 'zzz');
console.log(`서버 /zzz 명령 등록: ${zzz ? '정상' : commands.status === 200 ? '등록되지 않음' : '조회 실패 (' + commands.status + ')'}`);
if (zzz) console.log(`등록된 하위 명령: ${(zzz.options || []).map(o => o.name).join(', ')}`);
if (config.provider === 'ollama') {
  try {
    const r = await fetch(`${config.ollamaUrl}/api/version`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    console.log(`로컬 AI 연결: ${r.ok ? '정상' : 'HTTP ' + r.status}`);
  } catch { console.log('로컬 AI 연결: 실패'); }
}
