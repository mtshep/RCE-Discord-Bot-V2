// File: commands/shop/view_shop.js
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Browse the in-game shop.'),
  
    async execute(interaction, client) {
      const [rows] = await client.database_connection.execute('SELECT * FROM shop_items');
      if (!rows.length) {
        return await interaction.reply({ content: 'The shop is currently empty.', ephemeral: true });
      }
  
      const itemsPerPage = 5;
      const pages = Math.ceil(rows.length / itemsPerPage);
  
      const generateEmbed = (page) => {
        const embed = new EmbedBuilder()
          .setColor('#00AAFF')
          .setTitle('🛒 Dumz Paradise Shop')
          .setFooter({ text: `Page ${page + 1} of ${pages}` })
          .setTimestamp();
  
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = rows.slice(start, end);
  
        pageItems.forEach((item) => {
          embed.addFields({
            name: `${item.name} - 💵 ${item.price}`,
            value: `${item.description}\nReward: ${item.reward_type} (${item.reward_value})`,
            inline: false,
          });
        });
  
        return embed;
      };
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shop_next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
      );
  
      const currentPage = 0;
      const embed = generateEmbed(currentPage);
  
      const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
        fetchReply: true,
      });
  
      client.shopPagination = client.shopPagination || new Map();
      client.shopPagination.set(interaction.user.id, {
        messageId: response.id,
        currentPage,
        items: rows,
      });
    },
  };
  