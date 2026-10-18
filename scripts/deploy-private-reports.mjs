import { resolve, join, dirname } from 'node:path';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { moduleFiles } from './video-package.mjs';
import { oracleConnection, oracleScript } from './oracle-connection.mjs';
import { sha256File } from '../video/downloads.mjs';

const root = resolve(import.meta.dirname, '..'), connection = oracleConnection(root);
const domain = `reports.${connection.host.replaceAll('.', '-')}.sslip.io`;
const stage = join(root, '.tools/private-report-release'); mkdirSync(stage, { recursive: true });
const files = moduleFiles(root, ['services/private-reports.mjs', 'scripts/private-reports-cli.mjs']);
for (const file of files) { const target = join(stage, file); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(root, file), target); }
writeFileSync(join(stage, 'package.json'), JSON.stringify({ type: 'module', private: true }));
const archive = join(root, '.tools/private-reports.tar');
const tar = spawnSync(join(process.env.SystemRoot || 'C:/Windows', 'System32/tar.exe'), ['-cf', archive, '-C', stage, ...files, 'package.json'], { shell: false, windowsHide: true, encoding: 'utf8' });
if (tar.status || tar.error) throw new Error('신고 서버 배포 파일을 준비하지 못했습니다.');
console.log(oracleScript('umask 077\nmkdir -p /home/ubuntu/zzz-video-reports/app/data /home/ubuntu/zzz-video-reports/deploy\n'));
const scp = join(process.env.SystemRoot || 'C:/Windows', 'System32/OpenSSH/scp.exe');
const result = spawnSync(scp, [...connection.args.slice(0, -1), archive, `ubuntu@${connection.host}:/home/ubuntu/zzz-video-reports/deploy/reports.tar`], { shell: false, windowsHide: true, encoding: 'utf8', timeout: 60000 });
if (result.error || result.status) throw new Error('신고 서버 배포 파일 전송에 실패했습니다.');
const digest = await sha256File(archive);
const script = `set -euo pipefail
umask 077
cd /home/ubuntu/zzz-video-reports
echo '${digest}  deploy/reports.tar' | sha256sum -c -
if ! command -v caddy >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
fi
sudo systemctl stop zzz-video-reports.service 2>/dev/null || true
tar -xf deploy/reports.tar -C app
sudo tee /etc/systemd/system/zzz-video-reports.service >/dev/null <<'UNIT'
[Unit]
Description=Zenless private video translation reports
After=network-online.target
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/zzz-video-reports/app
ExecStart=/opt/zzz-node-v24.21.0/bin/node services/private-reports.mjs
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/ubuntu/zzz-video-reports/app/data
MemoryMax=256M
TasksMax=32
[Install]
WantedBy=multi-user.target
UNIT
sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
${domain} {
  header Strict-Transport-Security "max-age=31536000"
  @reports path /api/reports /health
  handle @reports {
    reverse_proxy 127.0.0.1:4321
  }
  respond 404
}
CADDY
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl daemon-reload
sudo systemctl enable --now zzz-video-reports.service
for port in 80 443; do sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport "$port" -j ACCEPT; done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sleep 2
curl -fsS http://127.0.0.1:4321/health
sudo systemctl is-active zzz-translate
`;
console.log(oracleScript(script));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/report-service.json'), JSON.stringify({ schema: 1, reports: `https://${domain}/api/reports`, health: `https://${domain}/health` }, null, 2));
console.log('신고 서비스 배포 완료. 외부 HTTPS 연결을 확인하세요.');
