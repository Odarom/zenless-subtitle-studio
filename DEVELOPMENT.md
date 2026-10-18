# Development

Requires Node.js 24.17+; Windows x64 is the supported portable target.

- Install source dependencies: `npm ci` (Discord bot only).
- Start the subtitle app: `node video/server.mjs --open`.
- Prepare local tools: `node scripts/video-setup.mjs`.
- Run tests: `npm test` and `npm run video:test`.
- Build extension and Windows package: `npm run video:package`.
- Package integration: `node scripts/video-package-smoke.mjs`. It needs the public sample media and downloaded tools described in the smoke scripts.
- Update integration: `node scripts/video-update-smoke.mjs`.
- Publish source only: `node scripts/video-publish.mjs --source-only`.
- Publish tested release and update feed: `node scripts/video-publish.mjs`. GitHub CLI must be authenticated as the repository owner. Existing releases are never overwritten with a different ZIP.

The `src` tree also contains the related Discord bot. The `services` tree contains the optional maintainer-only private report receiver; app users do not deploy it. The receiver is separate from the Discord runtime. Operator SSH and deployment configuration are deliberately excluded.

Never commit `.env`, `.secrets`, `data`, `reports`, `.tools`, models, downloaded media or a used portable installation. Runtime reports are untrusted data. Confirm corrections against authoritative sources before publishing glossary changes.
