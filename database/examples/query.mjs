import { readFile } from 'node:fs/promises';
import { createDatabase, GLOSSARY_INSTRUCTIONS } from '../index.mjs';

// Run from a downloaded database repository or a built database distribution.
// File resolution is relative to this example, not the terminal directory.
const [text = 'Deadly Assault', targetLanguage = 'ko', sourceLanguage = 'en'] = process.argv.slice(2);

try {
  const catalog = JSON.parse(await readFile(new URL('../../catalog/concepts.json', import.meta.url), 'utf8'));
  const database = createDatabase(catalog);
  const candidates = database.search(text);
  const glossary = database.prompt(candidates, {
    text,
    languages: [...new Set([sourceLanguage, targetLanguage])],
    style: 'official',
  });
  // This is translation input preparation. No AI request or text replacement.
  console.log(JSON.stringify({ instructions: GLOSSARY_INSTRUCTIONS, text, sourceLanguage, targetLanguage, glossary }, null, 2));
} catch (error) {
  console.error(`Database example: ${error.message}`);
  process.exitCode = 1;
}
