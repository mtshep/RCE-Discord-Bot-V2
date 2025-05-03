const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
  TextInputStyle,
  Events,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add Your Server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('add_server')
      .setTitle('Add Your Server');

    const identifier = new TextInputBuilder()
      .setCustomId('identifier')
      .setLabel('Server Identifier')
      .setPlaceholder('Can Be Anything')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const server_region = new TextInputBuilder()
      .setCustomId('server_region')
      .setLabel('Server Region')
      .setPlaceholder('Either EU/US')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const server_id = new TextInputBuilder()
      .setCustomId('server_id')
      .setLabel('Server ID')
      .setPlaceholder('Your GPortal Server ID (Found In Address Bar)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(identifier),
      new ActionRowBuilder().addComponents(server_region),
      new ActionRowBuilder().addComponents(server_id)
    );

    await interaction.showModal(modal);
  },

  async initModalHandler(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId !== 'add_server') return;

      const identifier = interaction.fields.getTextInputValue('identifier');
      const region = interaction.fields.getTextInputValue('server_region').toUpperCase();
      const serverId = interaction.fields.getTextInputValue('server_id');
      const guild = interaction.guild;

      try {
        await client.database_connection.execute(
          `INSERT INTO servers (
            identifier, region, server_id, guild_id, guild_owner,
            npc_kill_points, npc_death_points, player_kill_points, player_death_points, suicide_points,
            enabled
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            identifier,
            region,
            serverId,
            guild.id,
            guild.ownerId,
            1, 1, 1, 1, 0, // Default points
            true
          ]
        );

        await interaction.reply({
          content: `✅ Server "${identifier}" has been successfully added.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error("[ADD SERVER] DB INSERT ERROR:", err);
        if (!interaction.replied) {
          await interaction.reply({
            content: `❌ Failed to save server: ${err.message}`,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: `❌ Follow-up error: ${err.message}`,
            ephemeral: true,
          });
        }
      }
    });
  }
};
