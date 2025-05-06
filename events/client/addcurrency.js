const {
    SlashCommandBuilder,
    PermissionFlagsBits,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('addcurrency')
      .setDescription('Give currency to a user on this server')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to give currency to')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('amount')
          .setDescription('Amount of currency to add')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const serverId = interaction.guild.id;
      const db = interaction.client.database_connection;
  
      try {
        // Create or update the player's currency entry
        await db.execute(
          `INSERT INTO players (discord_id, server, display_name, currency)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE currency = currency + VALUES(currency)`,
          [targetUser.id, serverId, targetUser.username, amount]
        );
  
        await interaction.reply({
          content: `💸 Added **${amount}** currency to <@${targetUser.id}>.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error('[ADD CURRENCY ERROR]', err);
        await interaction.reply({
          content: `❌ Failed to add currency: ${err.message}`,
          ephemeral: true,
        });
      }
    },
  };