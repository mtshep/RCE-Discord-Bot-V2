// /commands/shop/admin_add_item.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_item')
    .setDescription('Add a new item to the shop')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Item name').setRequired(true))
    .addStringOption(opt =>
      opt.setName('description').setDescription('Item description').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('price').setDescription('Cost in Dumz Dollars').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reward_type')
        .setDescription('What the item gives')
        .setRequired(true)
        .addChoices(
          { name: 'Kit', value: 'kit' },
          { name: 'Role', value: 'role' },
          { name: 'Code', value: 'code' },
        ))
    .addStringOption(opt =>
      opt.setName('reward_value')
        .setDescription('Value for the reward (kit name, role ID, etc)')
        .setRequired(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description');
    const price = interaction.options.getInteger('price');
    const reward_type = interaction.options.getString('reward_type');
    const reward_value = interaction.options.getString('reward_value');

    try {
      await interaction.client.database_connection.execute(
        `INSERT INTO shop_items (name, description, price, reward_type, reward_value) VALUES (?, ?, ?, ?, ?)`,
        [name, description, price, reward_type, reward_value]
      );
      await interaction.reply({ content: `✅ Item \`${name}\` added to the shop.`, ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: `❌ Failed to add item: ${err.message}`, ephemeral: true });
    }
  },
};



























