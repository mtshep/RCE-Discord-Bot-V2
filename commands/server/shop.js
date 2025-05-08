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
    .setName('shop')
    .setDescription('Browse and buy items using Dumz Dollars'),

  async execute(interaction, client) {
    const userId = interaction.user.id;

    // Fetch player info
    const [playerRows] = await client.database_connection.query(
      'SELECT * FROM players WHERE discord_id = ?',
      [userId]
    );

    if (!playerRows.length) {
      return interaction.reply({
        content: '⚠️ You must be linked to use the shop.',
        ephemeral: true,
      });
    }

    // Step 1: Fetch available servers
    const [serverRows] = await client.database_connection.query(
      'SELECT * FROM servers'
    );

    if (!serverRows.length) {
      return interaction.reply({
        content: '⚠️ No servers are available.',
        ephemeral: true,
      });
    }

    const serverOptions = serverRows.map(server => ({
      label: `${server.name} (${server.identifier})`,
      value: String(server.identifier), // use identifier as value
    }));

    // Step 2: Ask user to select servers
    const serverSelectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_servers')
        .setPlaceholder('Select servers to apply purchases to')
        .setMinValues(1)
        .setMaxValues(serverOptions.length)
        .addOptions(serverOptions)
    );

    await interaction.reply({
      content: '🌐 Please select one or more servers:',
      components: [serverSelectMenu],
      ephemeral: true,
    });

    const selection = await interaction.channel.awaitMessageComponent({
      filter: (i) => i.user.id === userId && i.customId === 'select_servers',
      time: 60_000,
    });

    const selectedServerIdentifiers = selection.values;

    await selection.update({ content: '✅ Servers selected! Loading shop...', components: [] });

    const player = playerRows[0];

    // Get all available items
    const [items] = await client.database_connection.query(
      'SELECT * FROM shop_items WHERE available_on_shop = TRUE'
    );

    if (!items.length) {
      return interaction.reply({ content: '🛫 No items are currently for sale.', ephemeral: true });
    }

    // Group by category
    const categories = [...new Set(items.map(item => item.category))];
    const pages = categories.map(category => ({
      category,
      items: items.filter(item => item.category === category),
    }));

    let currentPage = 0;
    const basket = [];

    const renderEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setTitle(`🛒 ${pages[page].category} Shop`)
        .setDescription(`Select an item to add to your basket.\nYour Dumz Balance: **${player.currency}**`)
        .setFooter({ text: `Page ${page + 1} of ${pages.length}` })
        .setColor('Green');

      for (const item of pages[page].items.slice(0, 10)) {
        embed.addFields({
          name: `${item.name} - ${item.price} 💠`,
          value: item.description || item.shortname || 'No description',
        });
      }

      return embed;
    };

    const renderSelectMenu = (page) => {
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_item')
          .setPlaceholder('Select an item to add to basket')
          .addOptions(
            pages[page].items.slice(0, 25).map(item => ({
              label: item.name,
              value: item.id.toString(),
              description: `Price: ${item.price} 💠`,
            }))
          )
      );
    };

    const renderButtons = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('checkout').setLabel('✅ Checkout').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary)
      );
    };

    await interaction.followUp({
      embeds: [renderEmbed(currentPage)],
      components: [renderSelectMenu(currentPage), renderButtons()],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'next') {
        currentPage = (currentPage + 1) % pages.length;
        await i.update({
          embeds: [renderEmbed(currentPage)],
          components: [renderSelectMenu(currentPage), renderButtons()],
        });
      } else if (i.customId === 'prev') {
        currentPage = (currentPage - 1 + pages.length) % pages.length;
        await i.update({
          embeds: [renderEmbed(currentPage)],
          components: [renderSelectMenu(currentPage), renderButtons()],
        });
      } else if (i.customId === 'select_item') {
        const selectedId = parseInt(i.values[0]);
        const item = items.find(it => it.id === selectedId);
        basket.push(item);
        await i.reply({ content: `🛍️ Added **${item.name}** to basket!`, ephemeral: true });
      } else if (i.customId === 'checkout') {
        const total = basket.reduce((sum, item) => sum + item.price, 0);
        if (player.currency < total) {
          return i.reply({ content: `❌ Not enough Dumz Dollars! You need ${total}, but only have ${player.currency}.`, ephemeral: true });
        }

        // Deduct currency
        await client.database_connection.query(
          'UPDATE players SET currency = currency - ? WHERE id = ?',
          [total, player.id]
        );

        console.log(`[SHOP] Player display name: ${player.display_name}`);

        // Issue all rewards
        for (const item of basket) {
          if (item.reward_type === 'item') {
            for (const serverIdentifier of selectedServerIdentifiers) {
              try {
                const itemIdFormatted = isNaN(item.item_id) ? `"${item.item_id}"` : item.item_id;
                const result = await client.rce.servers.command(serverIdentifier, `item.give "${player.display_name}" ${itemIdFormatted} 1`);
                console.log(`[SHOP] ✅ RCE Response from ${serverIdentifier}:`, result);
              } catch (err) {
                console.error(`[SHOP] ❌ RCE ERROR on ${serverIdentifier}:`, err);
              }
            }
          }
        }

        collector.stop();
        return i.update({
          content: `✅ You successfully purchased:\n${basket.map(i => `• ${i.name} (${i.price} 💠)`).join('\n')}\nNew balance: **${player.currency - total}** 💠`,
          embeds: [],
          components: [],
        });
      }
    });
  },
};