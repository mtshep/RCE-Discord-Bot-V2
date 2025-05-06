const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcurrency')
    .setDescription('Add currency to a player')
    .addStringOption(option =>
      option.setName('player_id')
        .setDescription('The player ID')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of currency to add')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const playerId = interaction.options.getString('player_id');
    const amount = interaction.options.getInteger('amount');

    // Example DB update logic
    await interaction.client.database_connection.query(
      `UPDATE players SET currency = currency + ? WHERE id = ?`,
      [amount, playerId]
    );

    await interaction.reply({
      content: `✅ Added ${amount} currency to player \`${playerId}\`.`,
      ephemeral: true
    });
  }
};