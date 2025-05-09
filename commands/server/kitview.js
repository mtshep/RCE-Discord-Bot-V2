const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View available kits on a selected server'),

  async execute(interaction, client) {
    const userId = interaction.user.id;

    const [playerRows] = await client.database_connection.query(
      'SELECT * FROM players WHERE discord_id = ?',
      [userId]
    );

    if (!playerRows.length) {
      return interaction.reply({
        content: '⚠️ You must be linked to use this command.',
        ephemeral: true,
      });
    }

    const [servers] = await client.database_connection.query('SELECT * FROM servers');
    if (!servers.length) {
      return interaction.reply({
        content: '⚠️ No servers are available.',
        ephemeral: true,
      });
    }

    const serverOptions = servers.map((s) => ({
      label: `${s.identifier} (${s.region})`,
      value: s.identifier,
    }));

    const serverSelectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_kits_server')
        .setPlaceholder('Select server')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(serverOptions)
    );

    await interaction.reply({
      content: '🌐 Please select a server:',
      components: [serverSelectMenu],
      ephemeral: true,
    });

    const selection = await interaction.channel.awaitMessageComponent({
      filter: (i) => i.user.id === userId && i.customId === 'select_kits_server',
      time: 30_000,
    });

    const serverId = selection.values[0];
    await selection.update({ content: 'Fetching kits...', components: [] });

    // Step 1: Get kits using `kit list`
    const kitListResponse = await client.rce.servers.command(serverId, 'kit list');
    const kitNames = kitListResponse
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.trim());

    const kits = [];

    for (const name of kitNames) {
      try {
        const info = await client.rce.servers.command(serverId, `kit info "${name}"`);
        const itemList = info
          .split('\n')
          .slice(1)
          .filter((line) => line.trim() !== '')
          .map((line) => line.trim());

        // Find matching shop item for image
        const [[shopItem]] = await client.database_connection.query(
          'SELECT image FROM shop_items WHERE reward_type = "kit" AND reward_value = ? LIMIT 1',
          [name]
        );

        kits.push({
          name,
          items: itemList,
          image: shopItem?.image || null,
        });
      } catch (err) {
        console.error(`Error fetching info for kit "${name}":`, err.message);
      }
    }

    if (!kits.length) {
      return await interaction.followUp({
        content: '❌ No kits found on the selected server.',
        ephemeral: true,
      });
    }

    // Pagination
    let current = 0;

    const renderEmbed = (index) => {
      const kit = kits[index];
      const embed = new EmbedBuilder()
        .setTitle(`🎒 Kit: ${kit.name}`)
        .setDescription(kit.items.length ? kit.items.join('\n') : 'No items found.')
        .setFooter({ text: `Kit ${index + 1} of ${kits.length}` })
        .setColor('Blue');

      if (kit.image) embed.setThumbnail(kit.image);
      return embed;
    };

    const renderButtons = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_kit').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('next_kit').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary)
      );
    };

    const message = await interaction.followUp({
      embeds: [renderEmbed(current)],
      components: [renderButtons()],
      ephemeral: true,
    });

    const collector = message.createMessageComponentCollector({
      time: 60_000,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'prev_kit') {
        current = (current - 1 + kits.length) % kits.length;
      } else if (i.customId === 'next_kit') {
        current = (current + 1) % kits.length;
      }
      await i.update({
        embeds: [renderEmbed(current)],
        components: [renderButtons()],
      });
    });
  },
};
