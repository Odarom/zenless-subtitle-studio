# Personal servers and independent bots

The public bot and the personal translator are separate processes. Most users install the public bot and run **only a personal translator**. Provider keys belong on their own PC/server. Glossary updates run at startup and every six hours on either platform; code updates are a separate installation step.

## Personal translator on a server

Install Node.js 24.17+ and download the source. No Discord token or library installation is required for the translator itself. Configure `.env.runner` from `.env.runner.example` with your own provider/key/model, then pair using the code from Discord `/zzz connect`:

~~~sh
chmod 600 .env.runner
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

Keep it online with a process manager. Example fields must be adapted to your service user, project path and absolute Node executable path (`command -v node`). Never run the same connection in multiple processes. The runner connects outward using HTTPS; it does not need an inbound web port.

~~~ini
[Unit]
Description=Personal Zenless translator
After=network-online.target
Wants=network-online.target
[Service]
User=CHANGE_TO_YOUR_USER
WorkingDirectory=/srv/zenless-discord-translator
ExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env.runner /srv/zenless-discord-translator/scripts/discord-runner.mjs start
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
~~~

## Several servers and private management UI

The PC UI supports **multiple server profiles**. Each profile has its own pairing, model, provider key, daily quota and usage file. The same key or different keys can be used; provider project quotas may still be shared even across different keys. Stop only the selected profile before replacing its key; other profiles keep running.

The same UI can run on your personal server without launching a browser:

~~~sh
node scripts/runner-ui.mjs --no-open
~~~

Use this command instead of the single-runner command in the service example if you want the profile manager. Profiles last marked running resume when the manager starts. The manager listens **only on 127.0.0.1:4323**. Do not expose that port publicly or put its private session link in a public page.

Open an SSH tunnel from your PC:

~~~sh
ssh -N -L 14323:127.0.0.1:4323 YOUR_USER@YOUR_SERVER
~~~

In a separate SSH session, read `data/runner-ui/window.json` in your private installation. Its link contains a local management session token, **not a provider API key**. Replace port 4323 in that link with 14323 and open it on your PC. Keep the SSH tunnel open while managing. The browser talks through SSH to your own server; keys are saved only there. Local UI API access requires a random session token and checks Host/Origin.

PC UI settings are encrypted locally. The private server's administrator can decrypt its own settings, so use it only on infrastructure you control. Do not submit keys to Discord or to the project maintainer. Headless `.env.runner` is a private file and must not be committed. During an update, stop processes, replace code, preserve `.env.runner`, `data/` and local encryption keys, and restart. Do not copy `runner.lock` or `bot.lock` between machines.

## Operate your own Discord broker (advanced)

Create your own application at the [Discord Developer Portal](https://discord.com/developers/applications), enable **Message Content Intent**, and use Guild Install scopes `bot` and `applications.commands` with View Channel, Send Messages, Read Message History and Manage Webhooks. A full Administrator permission is unnecessary.

Copy `.env.example` to `.env`, enter your own Discord token and Application ID, set `API_MODE=runner`, and change `RUNNER_PUBLIC_URL` to your own HTTPS origin. Install Discord dependencies with `npm ci --ignore-scripts`, then run `npm run check`, `npm run register` and `npm start`. Registration prints the installation link for your application. Keep your token private.

The broker listens on loopback port 4322. Configure your HTTPS reverse proxy to send `/api/runner/*` to `127.0.0.1:4322`. The public bot accepts pairing metadata, chat work and results; provider keys stay on personal runners. Connect one runner per guild. Independent operators must publish their own privacy policy and comply with Discord/provider terms.

`PROJECT_REPORT_SHARING=on` offers report authors a separate consent/preview before forwarding a minimized report to the project maintainer. A broker already operated by the project maintainer uses `PROJECT_REPORT_SHARING=off`, since its local reports already reach that maintainer. Reports are not publicly listed or automatically applied.

Legacy `API_MODE=server` directly calls providers and lets the host decrypt submitted keys. Restrict it to a personal installation using **only your own keys**. Do not use it to collect other users' credentials.
