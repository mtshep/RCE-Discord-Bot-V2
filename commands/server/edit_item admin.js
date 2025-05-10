const {
    SlashCommandBuilder,
    PermissionFlagsBits,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('edit_item')
      .setDescription('Edit an existing item in the shop.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addIntegerOption(option =>
        option.setName('id')
          .setDescription('The ID of the item to edit')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('New name of the item (leave blank to keep unchanged)'))
      .addStringOption(option =>
        option.setName('description')
          .setDescription('New description (leave blank to keep unchanged)'))
      .addIntegerOption(option =>
        option.setName('price')
          .setDescription('New price (leave blank to keep unchanged)'))
      .addStringOption(option =>
        option.setName('reward_type')
          .setDescription('New reward type')
          .addChoices(
            { name: 'Kit', value: 'kit' },
            { name: 'Role', value: 'role' },
            { name: 'Code', value: 'code' }
          ))
      .addStringOption(option =>
        option.setName('reward_value')
          .setDescription('New reward value (e.g., role ID, kit name, or code)')),
  
    async execute(interaction) {
      const id = interaction.options.getInteger('id');
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const price = interaction.options.getInteger('price');
      const reward_type = interaction.options.getString('reward_type');
      const reward_value = interaction.options.getString('reward_value');
  
      const updates = [];
      const values = [];
  
      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }
      if (price !== null) {
        updates.push('price = ?');
        values.push(price);
      }
      if (reward_type) {
        updates.push('reward_type = ?');
        values.push(reward_type);
      }
      if (reward_value) {
        updates.push('reward_value = ?');
        values.push(reward_value);
      }
  
      if (updates.length === 0) {
        return interaction.reply({ content: 'No fields were provided to update.', ephemeral: true });
      }
  
      const sql = `UPDATE shop_items SET ${updates.join(', ')} WHERE id = ?`;
      values.push(id);
  
      try {
        await interaction.client.database_connection.execute(sql, values);
        await interaction.reply({ content: `Item ID ${id} updated successfully.`, ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: `Failed to update item: ${err.message}`, ephemeral: true });
      }
    }
  };