import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
export function oracleConnection(root = resolve(import.meta.dirname, '..')) {
  const path = resolve(root, '.secrets/oracle-host.json'), key = resolve(root, '.secrets/oracle-zzz'), hosts = resolve(root, '.secrets/oracle-known-hosts');
  if (![path, key, hosts].every(existsSync)) throw new Error('기존 운영 서버 접속 설정을 찾지 못했습니다.');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.user !== 'ubuntu' || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(config.host) || config.host.split('.').some(x => Number(x) > 255)) throw new Error('운영 서버 접속 설정을 확인하세요.');
  const executable = process.platform === 'win32' ? resolve(process.env.SystemRoot || 'C:/Windows', 'System32/OpenSSH/ssh.exe') : 'ssh';
  return { executable, host: config.host, args: ['-i', key, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${hosts}`, '-o', 'ConnectTimeout=15', `ubuntu@${config.host}`] };
}
export function oracleScript(script) {
  const { executable, args } = oracleConnection();
  const r = spawnSync(executable, [...args, 'bash -s'], { shell: false, windowsHide: true, encoding: 'utf8', input: script.replace(/\r\n/g, '\n'), timeout: 120000, maxBuffer: 2 * 1048576 });
  if (r.error || r.status) throw new Error(r.stderr?.trim().slice(-1000) || '운영 서버 명령 실행 실패');
  return r.stdout;
}
