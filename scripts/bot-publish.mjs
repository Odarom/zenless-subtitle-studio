// Publish the hosted bot's usage page instead of a self-hosting source snapshot.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stageBot, publishBot } from './hosted-bot-publish.mjs';
export { BOT_REPOSITORY, BOT_INVITE, botSource, stageBot, publishBot } from './hosted-bot-publish.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(process.argv.includes('--stage-only') ? stageBot() : publishBot(undefined, { recreate: process.argv.includes('--recreate') }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
