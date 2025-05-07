const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ComponentType,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder().setName('shop').setDescription('Browse and buy items from the Dumz Paradise shop.'),
  
    async execute(interaction, client) {
      await interaction.deferReply({ ephemeral: true });
  
      const [rows] = await client.database_connection.query(
        'SELECT * FROM shop_items WHERE available_on_shop = TRUE'
      );
  
      if (!rows.length) {
        return interaction.editReply({ content: 'No items are available in the shop currently.' });
      }
  
      const categories = [...new Set(rows.map((item) => item.category))];
  
      const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('Select a category')
        .addOptions(
          categories.map((category) =>
            new StringSelectMenuOptionBuilder().setLabel(category).setValue(category)
          )
        );
  
      const categoryRow = new ActionRowBuilder().addComponents(categoryMenu);
  
      const filter = (i) => i.user.id === interaction.user.id;
  
      const msg = await interaction.editReply({
        content: 'Choose a category to browse items:',
        components: [categoryRow],
      });
  
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
      });
  
      collector.on('collect', async (selectInteraction) => {
        const selectedCategory = selectInteraction.values[0];
        const items = rows.filter((item) => item.category === selectedCategory);
  
        const embeds = items.map((item) => {
          return new EmbedBuilder()
            .setTitle(item.name)
            .setDescription(`**Price:** ${item.price} Dumz Dollars\n**Quantity:** ${item.quantity}`)
            .setThumbnail(item.image)
            .addFields(
              { name: 'Short Name', value: item.shortname, inline: true },
              { name: 'Reward Type', value: item.reward_type, inline: true }
            );
        });
  
        const buttons = items.map((item) =>
          new ButtonBuilder()
            .setCustomId(`shop_add_${item.id}`)
            .setLabel(`Add ${item.name}`)
            .setStyle('Primary')
        );
  
        const buttonRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
          buttonRows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }
  
        await selectInteraction.update({
          content: `Category: **${selectedCategory}**`,
          embeds,
          components: buttonRows,
        });
  
        const basketCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000,
        });
  
        const userBasket = [];
  
        basketCollector.on('collect', async (buttonInteraction) => {
          if (!buttonInteraction.customId.startsWith('shop_add_')) return;
          const itemId = buttonInteraction.customId.split('_')[2];
          const selectedItem = rows.find((i) => i.id == itemId);
          if (!selectedItem) {
            return buttonInteraction.reply({
              content: 'Item not found.',
              ephemeral: true,
            });
          }
  
          userBasket.push(selectedItem);
          await buttonInteraction.reply({
            content: `✅ Added **${selectedItem.name}** to your basket.`,
            ephemeral: true,
          });
  
          const basketTotal = userBasket.reduce((acc, item) => acc + item.price, 0);
  
          const checkoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('checkout').setLabel(`Checkout (${basketTotal})`).setStyle('Success')
          );
  
          await interaction.editReply({ components: [...buttonRows, checkoutRow] });
        });
  
        basketCollector.on('end', () => {
          interaction.editReply({ components: [] });
        });
  
        collector.stop();
      });
  
      const checkoutCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });
  
      checkoutCollector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId !== 'checkout') return;
  
        const [userRow] = await client.database_connection.query(
          'SELECT * FROM players WHERE discord_id = ? LIMIT 1',
          [interaction.user.id]
        );
  
        const user = userRow[0];
        if (!user) {
          return buttonInteraction.reply({
            content: 'You are not registered. Please link your account first.',
            ephemeral: true,
          });
        }
  
        const basketTotal = userBasket.reduce((acc, item) => acc + item.price, 0);
  
        if (user.currency < basketTotal) {
          return buttonInteraction.reply({
            content: `❌ You don’t have enough Dumz Dollars. You need **${basketTotal}**, but only have **${user.currency}**.`,
            ephemeral: true,
          });
        }
  
        for (const item of userBasket) {
          if (item.quantity <= 0) continue;
  
          await client.database_connection.execute(
            'UPDATE players SET currency = currency - ? WHERE discord_id = ?',
            [item.price, interaction.user.id]
          );
  
          await client.database_connection.execute(
            'UPDATE shop_items SET quantity = quantity - 1 WHERE id = ?',
            [item.id]
          );
  
          if (item.reward_type === 'kit') {
            await client.rce.servers.giveKit(user.server, user.region, user.display_name, item.shortname);
          }
        }
  
        await buttonInteraction.reply({
          content: '🎉 Purchase complete! Your items have been delivered (if applicable).',
          ephemeral: true,
        });
  
        await interaction.editReply({ components: [] });
      });
    },
  };
  