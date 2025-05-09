const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View all available kits'),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Step 1: Present a server select menu
    try {
      // Fetch servers associated with this guild (assuming function returns an array of servers)
      const servers = await interaction.client.functions.get_servers_for_guild(interaction.client, guildId);
      if (!servers || servers.length === 0) {
        return await interaction.reply({
          content: '⚠️ No servers found for this guild.',
          ephemeral: true
        });
      }

      const serverOptions = servers.map(server => ({
        label: server.name || server.identifier,
        description: server.identifier,
        value: server.identifier
      }));

      const serverSelect = new StringSelectMenuBuilder()
        .setCustomId('select_server')
        .setPlaceholder('Select a server')
        .addOptions(serverOptions);

      const row = new ActionRowBuilder().addComponents(serverSelect);

      await interaction.reply({
        content: 'Select a server to view its kits:',
        components: [row],
        ephemeral: true
      });

    } catch (error) {
      console.error('[KITS] Failed to get servers for guild:', error);
      return await interaction.reply({
        content: '⚠️ Failed to retrieve servers for this guild.',
        ephemeral: true
      });
    }
  },

  // Interaction handler for select menus
  async handleSelectMenu(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;

    if (customId === 'select_server') {
      // Step 2: On server select, fetch kit list and show dropdown
      const serverIdentifier = interaction.values[0];

      await interaction.deferUpdate();

      let kitListRaw;
      try {
        const kitListResult = await interaction.client.rce.servers.command(
          serverIdentifier,
          'kit list'
        );

        kitListRaw = kitListResult?.response;

        if (typeof kitListRaw !== 'string') {
          console.error('[KITS] Unexpected kitListRaw type:', typeof kitListRaw);
          return await interaction.editReply({
            content: '⚠️ Failed to retrieve kit list. Unexpected response format.',
            components: [],
            ephemeral: true
          });
        }

        const kitListResponse = kitListRaw.replace('[KITMANAGER] Kit list\n', '').split('\n').filter(k => k);

        if (kitListResponse.length === 0) {
          return await interaction.editReply({
            content: 'No kits found on this server.',
            components: [],
            ephemeral: true
          });
        }

        const kitOptions = kitListResponse.map(kitName => ({
          label: kitName,
          value: kitName
        }));

        const kitSelect = new StringSelectMenuBuilder()
          .setCustomId(`select_kit_${serverIdentifier}`)
          .setPlaceholder('Select a kit')
          .addOptions(kitOptions);

        const row = new ActionRowBuilder().addComponents(kitSelect);

        await interaction.editReply({
          content: `Kits available on server **${serverIdentifier}**:`,
          components: [row],
          ephemeral: true
        });

      } catch (err) {
        console.error('[KITS] Failed to retrieve kit list:', err);
        return await interaction.editReply({
          content: '⚠️ Failed to retrieve kit list.',
          components: [],
          ephemeral: true
        });
      }
    } else if (customId.startsWith('select_kit_')) {
      // Step 3: On kit select, fetch kit info and show embed with DB image
      const serverIdentifier = customId.replace('select_kit_', '');
      const kitName = interaction.values[0];

      await interaction.deferUpdate();

      let kitInfoRaw;
      try {
        kitInfoRaw = await interaction.client.rce.servers.command(
          serverIdentifier,
          `kit info "${kitName}"`
        );
      } catch (err) {
        console.error(`[KITS] Failed to retrieve info for kit ${kitName}:`, err);
        return await interaction.editReply({
          content: `⚠️ Failed to retrieve info for kit **${kitName}**.`,
          ephemeral: true,
          components: []
        });
      }

      const infoLines = kitInfoRaw.split('\n').slice(2); // Skip headers
      const fields = infoLines.map(line => {
        const match = line.match(/Shortname: (.*?) Amount: \[(\d+)\]/);
        return match ? {
          name: match[1],
          value: `Amount: ${match[2]}`,
          inline: true
        } : null;
      }).filter(Boolean);

      let imageRow;
      try {
        const [rows] = await interaction.client.database_connection.execute(
          'SELECT image FROM shop_items WHERE reward_type = ? AND reward_value = ? LIMIT 1',
          ['kit', kitName]
        );
        imageRow = rows[0];
      } catch (dbErr) {
        console.error('[KITS] DB error fetching image:', dbErr);
      }

      const embed = new EmbedBuilder()
        .setTitle(`Kit: ${kitName}`)
        .setColor('Blue')
        .setDescription('Contents:')
        .addFields(fields)
        .setTimestamp();

      if (imageRow && imageRow.image) embed.setThumbnail(imageRow.image);

      await interaction.editReply({
        content: `Details for kit **${kitName}**:`,
        embeds: [embed],
        components: [],
        ephemeral: true
      });
    }
  }
};
