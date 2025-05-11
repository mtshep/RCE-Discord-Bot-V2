const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playerstats')
    .setDescription('📊 View player status, location and stats')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the player to lookup')
        .setRequired(true)
    ),

  async execute(interaction) {
    const playerName = interaction.options.getString('name');
    const servers = interaction.client.servers;
    const plugin = interaction.client.rce.plugins.playerstats;

    let found = false;
    for (const server of servers) {
      try {
        const online = await plugin.isOnline(server.identifier, playerName);
        const location = await plugin.getLocation(server.identifier, playerName);
        const stats = await plugin.getStats(server.identifier, playerName);

        if (online === false && !location && !stats) continue;
        found = true;

        const embed = new EmbedBuilder()
          .setTitle(`📊 Stats for ${playerName}`)
          .setColor(0x00AE86)
          .addFields(
            { name: 'Server', value: server.identifier, inline: true },
            { name: 'Online', value: online ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Location', value: location || 'Unknown', inline: true },
            { name: 'Kills', value: stats?.kills?.toString() || '0', inline: true },
            { name: 'Deaths', value: stats?.deaths?.toString() || '0', inline: true },
            { name: 'Last Seen', value: stats?.lastSeen || 'N/A', inline: true },
          )
          .setFooter({ text: server.region });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      } catch (error) {
        console.error(`[PLAYERSTATS] Error for ${playerName} on ${server.identifier}:`, error);
      }
    }

    if (!found) {
      await interaction.reply({
        content: `⚠️ Player \`${playerName}\` not found on any server.`,
        ephemeral: true,
      });
    }
  }
};
