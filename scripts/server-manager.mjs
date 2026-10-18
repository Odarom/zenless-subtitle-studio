import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const root = resolve(import.meta.dirname, '..');
const connectionPath = resolve(root, '.secrets/oracle-host.json');
const privateKey = resolve(root, '.secrets/oracle-zzz');
const knownHosts = resolve(root, '.secrets/oracle-known-hosts');
if (!existsSync(connectionPath) || !existsSync(privateKey) || !existsSync(knownHosts)) {
  console.error('오라클 서버 이전이 완료된 뒤 사용할 수 있습니다. 접속 설정이나 SSH 키가 없습니다.');
  process.exit(1);
}
const connection = JSON.parse(readFileSync(connectionPath, 'utf8'));
const octets = String(connection.host).split('.');
if (connection.user !== 'ubuntu' || octets.length !== 4 || octets.some(x => !/^\d{1,3}$/.test(x) || Number(x) > 255)) {
  console.error('서버 접속 설정을 확인하세요.');
  process.exit(1);
}
console.log('오라클에서 실행 중인 번역 봇을 관리합니다. PC의 run.cmd를 함께 켜지 마세요.');
console.log('1. 봇 상태 확인\n2. 서버의 봇 다시 시작\n3. 최근 실행 기록 보기\n0. 종료');
const input = createInterface({ input: process.stdin, output: process.stdout });
const choice = (await input.question('번호 선택: ')).trim();
input.close();
const commands = {
  '1': 'sudo systemctl status zzz-translate --no-pager',
  '2': 'sudo systemctl restart zzz-translate && sudo systemctl status zzz-translate --no-pager',
  '3': 'sudo journalctl -u zzz-translate -n 30 --no-pager',
};
if (choice === '0') process.exit(0);
if (!Object.hasOwn(commands, choice)) {
  console.error('0~3 중 하나를 선택하세요.');
  process.exit(1);
}
const ssh = process.platform === 'win32' ? resolve(process.env.SystemRoot || 'C:/Windows', 'System32/OpenSSH/ssh.exe') : 'ssh';
const result = spawnSync(ssh, [
  '-i', privateKey, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
  '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${knownHosts}`,
  '-o', 'ConnectTimeout=15', `${connection.user}@${connection.host}`, commands[choice],
], { stdio: 'inherit', shell: false });
if (result.error) console.error('서버 접속 도구를 실행하지 못했습니다. Windows의 OpenSSH 설치 상태를 확인하세요.');
else if (result.status) console.error('서버 상태 또는 접속 오류를 위 기록에서 확인하세요.');
process.exit(result.status ?? 1);
