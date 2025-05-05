const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const button = interaction.customId;

    if (button.startsWith('edit_settings_')) {
      const server_id = button.split('_')[2];

      // Fetch current settings from the DB
      const db_server = await client.functions.get_server(client, server_id);
      if (!db_server) {
        return await interaction.reply({
          content: 'âš ï¸ Could not find server data.',
          ephemeral: true,
        });
      }

      // Create modal
      const modal = new ModalBuilder()
        .setCustomId(`edit_modal_${server_id}`)
        .setTitle(`Edit Settings: ${db_server.identifier}`);

      // Example editable setting: Loot Scale
      const lootInput = new TextInputBuilder()
        .setCustomId('loot_scale')
        .setLabel('Loot Scale (e.g. 1.0, 1.5, 2.0)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1.0')
        .setRequired(true)
        .setValue(db_server.loot_scale?.toString() || '1.0');

      modal.addComponents(
        new ActionRowBuilder().addComponents(lootInput)
        // Add more rows for other editable fields here if needed
      );

      return await interaction.showModal(modal);
    }

    else if (button.startsWith('refresh_settings_')) {
      // Existing refresh logic...
    }
  },
};
