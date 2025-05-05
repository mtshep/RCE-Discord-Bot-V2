const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId.startsWith('edit_settings_modal_')) {
      const server_id = interaction.customId.replace('edit_settings_modal_', '');
      const newNpcKillPoints = interaction.fields.getTextInputValue('npc_kill_points');

      try {
        await client.database_connection.execute(
          'UPDATE servers SET npc_kill_points = ? WHERE identifier = ?',
          [Number(newNpcKillPoints), server_id]
        );

        await interaction.reply({
          content: `✅ Updated NPC Kill Points for **${server_id}** to \`${newNpcKillPoints}\`.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(`[EDIT SETTINGS ERROR] ${error.message}`);
        await interaction.reply({
          content: `❌ Failed to update settings: ${error.message}`,
          ephemeral: true,
        });
      }
    }
  },
};
