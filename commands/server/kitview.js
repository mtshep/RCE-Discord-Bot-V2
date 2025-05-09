const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View all available kits and their contents'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const server = await interaction.client.functions.get_server_discord(
      interaction.client,
      guildId
    );

    try {
      const kitsList = await interaction.client.rce.servers.command(
        server.identifier,
        `kit list`
      );

      const kitNames = kitsList?.split('\n').filter(name => name.trim()) || [];

      if (!kitNames.length) {
        return await interaction.editReply({
          content: '⚠️ No kits found.',
        });
      }

      const kitEmbeds = [];

      for (const kitName of kitNames) {
        const kitDetails = await interaction.client.rce.servers.command(
          server.identifier,
          `kit info "${kitName}"`
        );

        const [rows] = await interaction.client.database_connection.query(
          'SELECT * FROM shop_items WHERE name = ? AND reward_type = "kit"',
          [kitName]
        );

        const image = rows[0]?.image || null;

        const embed = new EmbedBuilder()
          .setTitle(`🎒 Kit: ${kitName}`)
          .setDescription(kitDetails || 'No details available')
          .setColor('Blue')
          .setFooter({ text: 'Use /shop to purchase kits' });

        if (image) embed.setThumbnail(image);

        kitEmbeds.push(embed);
      }

      // Pagination
      let currentPage = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_kit')
          .setLabel('⬅️ Previous')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next_kit')
          .setLabel('➡️ Next')
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.editReply({
        embeds: [kitEmbeds[currentPage]],
        components: kitEmbeds.length > 1 ? [row] : [],
        fetchReply: true,
      });

      if (kitEmbeds.length < 2) return;

      const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120_000,
      });

      collector.on('collect', async i => {
        if (i.customId === 'next_kit') {
          currentPage = (currentPage + 1) % kitEmbeds.length;
        } else if (i.customId === 'prev_kit') {
          currentPage = (currentPage - 1 + kitEmbeds.length) % kitEmbeds.length;
        }

        await i.update({
          embeds: [kitEmbeds[currentPage]],
          components: [row],
        });
      });

      collector.on('end', async () => {
        await message.edit({ components: [] });
      });
    } catch (err) {
      console.error('[KITS ERROR]', err);
      await interaction.editReply({
        content: '❌ An error occurred while fetching kits.',
      });
    }
  },
};
