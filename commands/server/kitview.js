const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View all available kits'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const playerName = interaction.member.displayName;

    const server = await interaction.client.functions.get_server_discord(
      interaction.client,
      guildId
    );

    try {
      let kitListRaw;
      try {
        kitListRaw = await interaction.client.rce.servers.command(
          server.identifier,
          'kit list'
        );
      } catch (err) {
        console.error('[KITS] Failed to retrieve kit list:', err);
        return await interaction.reply({
          content: '⚠️ Failed to retrieve kit list.',
          ephemeral: true
        });
      }

      const kitListResponse = kitListRaw.replace('[KITMANAGER] Kit list\n', '').split('\n').filter(k => k);

      // Fetch item details for each kit
      const embeds = [];

      for (const kitName of kitListResponse) {
        let kitInfoRaw;
        try {
          kitInfoRaw = await interaction.client.rce.servers.command(
            server.identifier,
            `kit info "${kitName}"`
          );
        } catch (err) {
          console.error(`[KITS] Failed to retrieve info for kit ${kitName}:`, err);
          continue; // Skip this kit and move on to the next
        }

        const infoLines = kitInfoRaw.split('\n').slice(2); // Skip headers
        const fields = infoLines.map(line => {
          const match = line.match(/Shortname: (.*?) Amount: \[(\d+)\]/);
          return match ? {
            name: match[1],
            value: `Amount: ${match[2]}`
          } : null;
        }).filter(Boolean);

        const [[imageRow]] = await interaction.client.database_connection.execute(
          'SELECT image FROM shop_items WHERE reward_type = ? AND reward_value = ? LIMIT 1',
          ['kit', kitName]
        );

        const embed = new EmbedBuilder()
          .setTitle(`Kit: ${kitName}`)
          .setColor('Blue')
          .setDescription('Contents:')
          .addFields(fields)
          .setTimestamp();

        if (imageRow && imageRow.image) embed.setThumbnail(imageRow.image);

        embeds.push(embed);
      }

      // Paginate embeds (first page only shown for now)
      await interaction.reply({ embeds: [embeds[0]], ephemeral: true });

    } catch (err) {
      console.error('[KITS]', err);
      await interaction.reply({
        content: '⚠️ Error retrieving kits.',
        ephemeral: true
      });
    }
  }
};
