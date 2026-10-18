import { resolve } from 'node:path';
import { applyPreparedUpdate } from '../video/update-installer.mjs';
try { console.log(`프로그램 업데이트 완료: ${await applyPreparedUpdate(resolve(import.meta.dirname, '..'))}`); }
catch (error) { console.error(error.message); process.exitCode = 1; }
