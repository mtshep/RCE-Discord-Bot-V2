const { Events } = require('discord.js');
const cron = require('node-cron');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.functions.log('info', '[LIVE PLAYER] Player location sync started. Running every 2 minutes.');

    cron.schedule('*/2 * * * *', async () => {
      const servers = client.servers;

      for (const server of servers) {
        try {
          const usersCommand = 'global.users';
          const result = await client.rce.servers.command(server.identifier, usersCommand);

          if (!result.ok || !result.response || typeof result.response !== 'string') {
            client.functions.log('warning', `[${server.identifier}] Failed to fetch player list.`);
            continue;
          }

          const names = result.response
            .split('<slot:"name">')[1]
            ?.split('\\n')
            .map(n => n.replace(/\"/g, '').trim())
            .filter(name => name && !name.endsWith('users')) || [];

          await client.database_connection.execute('DELETE FROM live_player WHERE server = ?', [server.identifier]);

          for (const name of names) {
            try {
              const locationCommand = `player.location "${name}"`;
              const locationResult = await client.rce.servers.command(server.identifier, locationCommand);

              if (!locationResult.ok || !locationResult.response) continue;

              const coords = locationResult.response.match(/\[(\d+\.\d+), (\d+\.\d+), (\d+\.\d+)\]/);
              if (!coords) continue;

              const [, x, y, z] = coords.map(Number);

              await client.database_connection.execute(
                `INSERT INTO live_player (name, server, x, y, z) VALUES (?, ?, ?, ?, ?)`,
                [name, server.identifier, x, y, z]
              );
            } catch (err) {
              client.functions.log('error', `[LIVE PLAYER] Failed to get or insert location for ${name}: ${err.message}`);
            }
          }

        } catch (err) {
          client.functions.log('error', `[LIVE PLAYER] Error in loop for ${server.identifier}: ${err.message}`);
        }
      }
    });
  },
};