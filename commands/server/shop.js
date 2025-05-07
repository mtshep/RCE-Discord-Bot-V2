const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
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
  
      const player = playerRows[0];
  
      // Fetch available servers for the guild
      const [serverRows] = await client.database_connection.query(
        'SELECT identifier, region, server_id FROM servers WHERE guild_id = ?',
        [interaction.guild.id]
      );
  
      if (serverRows.length === 0) {
        return await interaction.reply({
          content: 'No linked servers found for this Discord. Please link a server first.',
          ephemeral: true,
        });
      }
  
      const serverOptions = serverRows.map(server => ({
        label: `${server.identifier} (${server.region})`,
        value: `${server.server_id}|${server.region}`,
      }));
  
      const serverEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🖥 Select Your Server')
        .setDescription('Choose the server you want to use for purchases.')
        .setFooter({ text: 'Dumz Paradise Shop' });
  
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_shop_server')
        .setPlaceholder('Select a server...')
        .addOptions(serverOptions);
  
      await interaction.reply({
        embeds: [serverEmbed],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        ephemeral: true,
      });
  
      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.user.id === userId && i.customId === 'select_shop_server',
        time: 60000,
      });
  
      collector.on('collect', async (i) => {
        const [server_id, region] = i.values[0].split('|');
        const server_identifier = serverRows.find(
          s => s.server_id.toString() === server_id && s.region === region
        )?.identifier;
  
        const [items] = await client.database_connection.query(
          'SELECT * FROM shop_items WHERE available_on_shop = TRUE'
        );
  
        if (!items.length) {
          return i.update({ content: '🚫 No items are currently for sale.', components: [], embeds: [] });
        }
  
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
              name: `${item.name} - ${item.price} 💰`,
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
                  description: `Price: ${item.price} 💰`,
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
  
        await i.update({
          embeds: [renderEmbed(currentPage)],
          components: [renderSelectMenu(currentPage), renderButtons()],
        });
  
        const shopCollector = i.channel.createMessageComponentCollector({
          time: 120000,
          filter: (compInt) => compInt.user.id === userId,
        });
  
        shopCollector.on('collect', async (i) => {
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
            if (!item) {
              return await i.reply({ content: '❌ Invalid item selected.', ephemeral: true });
            }
            basket.push(item);
            await i.reply({ content: `🛍️ Added **${item.name}** to basket!`, ephemeral: true });
          } else if (i.customId === 'checkout') {
            const total = basket.reduce((sum, item) => sum + item.price, 0);
            if (player.currency < total) {
              return i.reply({ content: `❌ Not enough Dumz Dollars! You need ${total}, but only have ${player.currency}.`, ephemeral: true });
            }
  
            try {
              await client.database_connection.query(
                'UPDATE players SET currency = currency - ? WHERE id = ?',
                [total, player.id]
              );
            } catch (err) {
              console.error('Failed to deduct currency:', err);
              return i.reply({ content: '❌ Failed to process your purchase. Please try again later.', ephemeral: true });
            }
  
            for (const item of basket) {
              if (item.reward_type === 'kit') {
                await client.rce.servers.command(server_identifier, `kit.give \"${player.display_name}\" \"${item.reward_value || item.name}\"`);
              }
            }
  
            shopCollector.stop();
            return i.update({
              content: `✅ You successfully purchased:\n${basket.map(i => `• ${i.name} (${i.price} 💰)`).join('\n')}\nNew balance: **${player.currency - total}** 💰`,
              embeds: [],
              components: [],
            });
          }
        });
  
        shopCollector.on('end', async () => {
          await interaction.editReply({
            content: '⏳ Shop session expired. Please use `/shop` to start again.',
            embeds: [],
            components: [],
          });
        });
      });
    },
  };
  