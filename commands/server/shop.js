const {
    SlashCommandBuilder,
    EmbedBuilder
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('buy')
      .setDescription('Buy an item from the shop')
      .addIntegerOption(option =>
        option.setName('item_id')
          .setDescription('The ID of the item you want to buy')
          .setRequired(true)
      ),
  
    async execute(interaction) {
      const itemId = interaction.options.getInteger('item_id');
      const playerName = interaction.member.displayName;
      const guildId = interaction.guild.id;
  
      const server = await interaction.client.functions.get_server_discord(
        interaction.client,
        guildId
      );
  
      try {
        const [[item]] = await interaction.client.database_connection.execute(
          'SELECT * FROM shop_items WHERE id = ?',
          [itemId]
        );
  
        if (!item) {
          return await interaction.reply({
            content: '❌ Item not found.',
            ephemeral: true
          });
        }
  
        const balance = await interaction.client.player_stats.get_points(
          server,
          playerName
        );
  
        if (balance < item.price) {
          return await interaction.reply({
            content: `❌ You need ${item.price} points but only have ${balance}.`,
            ephemeral: true
          });
        }
  
        await interaction.client.player_stats.remove_points(
          server,
          playerName,
          item.price
        );
  
        if (item.reward_type === 'kit') {
          await interaction.client.rce.sendCommand(
            server.identifier,
            `givekit ${playerName} ${item.reward_value}`
          );
        }
  
        const embed = new EmbedBuilder()
          .setTitle('✅ Purchase Successful!')
          .setDescription(`You bought **${item.name}** for **${item.price}** Dumz Dollars.`)
          .setColor('Green')
          .setTimestamp();
  
        await interaction.reply({ embeds: [embed], ephemeral: true });
  
      } catch (err) {
        console.error('[SHOP BUY ERROR]', err);
        await interaction.reply({
          content: '⚠️ There was an error processing your purchase.',
          ephemeral: true
        });
      }
    }
  };