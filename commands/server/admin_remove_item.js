// /commands/shop/admin_remove_item.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_item')
    .setDescription('Remove an item from the shop')
    .addIntegerOption(opt =>
      opt.setName('item_id').setDescription('ID of the item to remove').setRequired(true)),

  async execute(interaction) {
    const item_id = interaction.options.getInteger('item_id');

    try {
      const [result] = await interaction.client.database_connection.execute(
        `DELETE FROM shop_items WHERE id = ?`,
        [item_id]
      );

      if (result.affectedRows > 0) {
        await interaction.reply({ content: `🗑️ Item #${item_id} removed from the shop.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Item #${item_id} not found.`, ephemeral: true });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: `❌ Failed to remove item: ${err.message}`, ephemeral: true });
    }
  },
};
