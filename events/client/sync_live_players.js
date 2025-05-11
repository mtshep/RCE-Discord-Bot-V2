const { Events } = require('discord.js');
const cron = require('node-cron');
global.crypto = require('crypto');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.functions.log('info', '💬 [LIVE PLAYER] Player location sync started. Running every 2 minutes.');

    cron.schedule('*/2 * * * *', async () => {
      const servers = client.servers;

      for (const server of servers) {
        try {
          let responseText = null;

          const logHandler = async (data) => {
            if (data.identifier !== server.identifier) return;
            if (!data.message.includes('<slot:"name">') || !data.message.includes('users\\n')) return;

            responseText = data.message;
          };

          client.rce.events.on('LogMessage', logHandler);
          await client.rce.servers.command(server.identifier, 'global.users');

          await new Promise((resolve) => setTimeout(resolve, 3000));
          client.rce.events.off('LogMessage', logHandler);

          if (!responseText) {
            client.functions.log('warning', `[${server.identifier}] Failed to fetch player list from logs.`);
            continue;
          }

          const rawNames = responseText.split('<slot:"name">')[1].split('users\\n')[0];
          if (!rawNames) continue;

          const names = rawNames
            .split('\\n')
            .map(n => n.replace(/\"/g, '').trim())
            .filter(name => name && !name.endsWith('users'));

          await client.database_connection.execute(
            'DELETE FROM live_player WHERE server = ?',
            [server.identifier]
          );

          for (const name of names) {
            try {
              const locationCommand = `player.location "${name}"`;
              const locationResult = await client.rce.servers.command(server.identifier, locationCommand);

              if (!locationResult.ok || typeof locationResult.response !== 'string') continue;

              const coordsMatch = locationResult.response.match(/\[(\d+\.\d+), (\d+\.\d+), (\d+\.\d+)\]/);
              if (!coordsMatch) continue;

              const [, x, y, z] = coordsMatch.map(Number);

              await client.database_connection.execute(
                'INSERT INTO live_player (name, server, x, y, z) VALUES (?, ?, ?, ?, ?)',
                [name, server.identifier, x, y, z]
              );
            } catch (err) {
              client.functions.log('error', `[LIVE PLAYER] Failed location insert for ${name}: ${err.message}`);
            }
          }
        } catch (err) {
          client.functions.log('error', `[LIVE PLAYER] Server loop error for ${server.identifier}: ${err.message}`);
        }
      }
    });
  },
};