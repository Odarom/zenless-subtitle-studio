import { Routes } from 'discord.js';

// Keep one global definition. Remove only matching test-server copies after
// every global upsert succeeds; unrelated application commands stay intact.
export async function registerGlobalCommands({ rest, applicationId, guildId, definitions }) {
  const bodies = definitions.map(definition => definition.toJSON());
  for (const body of bodies) await rest.post(Routes.applicationCommands(applicationId), { body });
  let removed = 0;
  if (guildId) {
    const commands = await rest.get(Routes.applicationGuildCommands(applicationId, guildId));
    for (const command of commands) {
      if (!bodies.some(body => body.name === command.name && (body.type ?? 1) === command.type)) continue;
      await rest.delete(Routes.applicationGuildCommand(applicationId, guildId, command.id));
      removed++;
    }
  }
  return { removed };
}
