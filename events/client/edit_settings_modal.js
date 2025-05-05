const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId.startsWith('edit_settings_modal_')) {
      const serverId = interaction.customId.replace('edit_settings_modal_', '');

      const npcKillPoints = interaction.fields.getTextInputValue('npc_kill_points');
      const npcDeathPoints = interaction.fields.getTextInputValue('npc_death_points');
      const playerKillPoints = interaction.fields.getTextInputValue('player_kill_points');
      const playerDeathPoints = interaction.fields.getTextInputValue('player_death_points');
      const suicidePoints = interaction.fields.getTextInputValue('suicide_points');
      const extendedFeeds = interaction.fields.getTextInputValue('extended_feeds') === 'Enabled';
      const lootScale = interaction.fields.getTextInputValue('loot_scale');
      const outpost = interaction.fields.getTextInputValue('outpost');
      const banditCamp = interaction.fields.getTextInputValue('bandit');
      const hourlyKit = interaction.fields.getTextInputValue('hourly_kit');
      const vipKit = interaction.fields.getTextInputValue('vip_kit');
      const randomItems = interaction.fields.getTextInputValue('random_items') === 'Enabled';
      const raidAlerts = interaction.fields.getTextInputValue('raid_alerts') === 'Enabled';
      const linkedRoleId = interaction.fields.getTextInputValue('linked_role');
      const vipRoleId = interaction.fields.getTextInputValue('vip_role');

      try {
        await client.database_connection.execute(
          `UPDATE servers SET 
            npc_kill_points = ?,
            npc_death_points = ?,
            player_kill_points = ?,
            player_death_points = ?,
            suicide_points = ?,
            extended_feeds = ?,
            loot_scale = ?,
            outpost = ?,
            bandit = ?,
            hourly_kit_name = ?,
            vip_kit_name = ?,
            random_items = ?,
            raid_alerts = ?,
            linked_role_id = ?,
            vip_role_id = ?
          WHERE identifier = ?`,
          [
            npcKillPoints,
            npcDeathPoints,
            playerKillPoints,
            playerDeathPoints,
            suicidePoints,
            extendedFeeds,
            lootScale,
            outpost,
            banditCamp,
            hourlyKit,
            vipKit,
            randomItems,
            raidAlerts,
            linkedRoleId,
            vipRoleId,
            serverId
          ]
        );

        await interaction.reply({
          content: `✅ Settings updated for server: **${serverId}**`,
          ephemeral: true,
        });
      } catch (err) {
        console.error(`[EDIT SETTINGS] Failed to update:`, err);
        await interaction.reply({
          content: `❌ Failed to update settings: ${err.message}`,
          ephemeral: true,
        });
      }
    }
  }
};
