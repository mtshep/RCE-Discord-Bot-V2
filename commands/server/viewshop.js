// /commands/shop/view_shop.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Browse items available in the shop.'),
  
    async execute(interaction, client) {
      await interaction.deferReply({ ephemeral: true });
  
      // Fetch items from DB that are available_on_shop
      const [items] = await client.database_connection.execute(
        'SELECT * FROM shop_items WHERE available_on_shop = TRUE'
      );
  
      if (!items.length) {
        return await interaction.editReply({
          content: '🛒 The shop is currently empty.',
          ephemeral: true,
        });
      }
  
      // Group items by category
      const categories = [...new Set(items.map((item) => item.category || 'Other'))];
      const categoryMap = {};
      for (const category of categories) {
        categoryMap[category] = items.filter((item) => item.category === category);
      }
  
      // Create category select menu
      const categorySelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_category')
          .setPlaceholder('Select a category')
          .addOptions(
            categories.map((category) => ({
              label: category,
              value: category,
            }))
          )
      );
  
      // Send initial interaction with menu
      const reply = await interaction.editReply({
        content: 'Please choose a category to browse:',
        components: [categorySelect],
      });
  
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60_000,
      });
  
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: 'This menu isn\'t for you.', ephemeral: true });
  
        const selectedCategory = i.values[0];
        const itemsInCategory = categoryMap[selectedCategory];
        let page = 0;
        const itemsPerPage = 5;
  
        const renderPage = (pageIndex) => {
          const pageItems = itemsInCategory.slice(
            pageIndex * itemsPerPage,
            pageIndex * itemsPerPage + itemsPerPage
          );
  
          const embed = new EmbedBuilder()
            .setTitle(`🛒 Shop - ${selectedCategory}`)
            .setColor('#00AAFF')
            .setFooter({ text: `Page ${pageIndex + 1} of ${Math.ceil(itemsInCategory.length / itemsPerPage)}` });
  
          for (const item of pageItems) {
            embed.addFields({
              name: item.name,
              value: `💸 Price: ${item.price} Dumz Dollars\n🎁 Type: ${item.reward_type}\n🧾 Code: \`${item.shortname}\``,
              inline: false,
            });
          }
  
          const components = [];
  
          if (itemsInCategory.length > itemsPerPage) {
            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIndex === 0),
  
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled((pageIndex + 1) * itemsPerPage >= itemsInCategory.length)
            );
            components.push(buttons);
          }
  
          return { embeds: [embed], components };
        };
  
        await i.update(renderPage(page));
  
        const buttonCollector = i.channel.createMessageComponentCollector({
          filter: (b) => b.user.id === interaction.user.id,
          componentType: ComponentType.Button,
          time: 60_000,
        });
  
        buttonCollector.on('collect', async (btn) => {
          if (btn.customId === 'prev_page') page--;
          if (btn.customId === 'next_page') page++;
          await btn.update(renderPage(page));
        });
      });
    },
  };
  