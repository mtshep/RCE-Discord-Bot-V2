const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View all available in-game kits'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const server = await interaction.client.functions.get_server_discord(interaction.client, interaction.guild.id);
    if (!server) return interaction.editReply('❌ Server not found.');

    try {
      const rawList = await interaction.client.rce.sendCommand(server.identifier, 'kit list');
      const kitNames = rawList
        .split('\n')
        .slice(1) // skip the [KITMANAGER] Kit list
        .map(k => k.trim())
        .filter(Boolean);

      const kits = [];

      for (const name of kitNames) {
        const rawInfo = await interaction.client.rce.sendCommand(server.identifier, `kit info "${name}"`);
        const lines = rawInfo.split('\n').slice(2); // skip header
        const contents = lines.map(line => {
          const match = line.match(/Shortname: (.+?) Amount: \[(\d+)\]/);
          return match ? `${match[1]} x${match[2]}` : null;
        }).filter(Boolean);

        const [[shopMatch]] = await interaction.client.database_connection.query(
          'SELECT image FROM shop_items WHERE reward_value = ? LIMIT 1',
          [name]
        );

        kits.push({
          name,
          image: shopMatch?.image || null,
          contents
        });
      }

      let currentPage = 0;

      const renderEmbed = (kit) => {
        const embed = new EmbedBuilder()
          .setTitle(`🎒 Kit: ${kit.name}`)
          .setDescription(kit.contents.length ? kit.contents.join('\n') : 'No items found.')
          .setColor('Blue')
          .setFooter({ text: `Page ${currentPage + 1} of ${kits.length}` });

        if (kit.image) embed.setThumbnail(kit.image);
        return embed;
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.editReply({
        embeds: [renderEmbed(kits[currentPage])],
        components: [row],
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({
        time: 120_000,
        filter: i => i.user.id === interaction.user.id
      });

      collector.on('collect', async (btn) => {
        if (btn.customId === 'next') currentPage = (currentPage + 1) % kits.length;
        if (btn.customId === 'prev') currentPage = (currentPage - 1 + kits.length) % kits.length;

        await btn.update({
          embeds: [renderEmbed(kits[currentPage])],
          components: [row]
        });
      });

    } catch (err) {
      console.error('[KITS]', err);
      return interaction.editReply('⚠️ Failed to fetch kits.');
    }
  }
};
