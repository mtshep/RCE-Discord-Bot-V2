const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const button = interaction.customId;

    if (button.startsWith('edit_settings_')) {
      const server_id = button.split('_')[2];

      const modal = new ModalBuilder()
        .setCustomId(`edit_settings_modal_${server_id}`)
        .setTitle(`Edit Settings - ${server_id}`);

      const fields = [
        { id: 'npc_kill_points', label: 'NPC Kill Points' },
        { id: 'npc_death_points', label: 'NPC Death Points' },
        { id: 'player_kill_points', label: 'Player Kill Points' },
        { id: 'player_death_points', label: 'Player Death Points' },
        { id: 'suicide_points', label: 'Suicide Points' },
        { id: 'extended_feeds', label: 'Extended Feeds (Enabled/Disabled)' },
        { id: 'loot_scale', label: 'Loot Scale (e.g., 1X)' },
        { id: 'outpost', label: 'Outpost (Enabled/Disabled)' },
        { id: 'bandit', label: 'Bandit Camp (Enabled/Disabled)' },
        { id: 'hourly_kit_name', label: 'Hourly Kit Name' },
        { id: 'vip_kit_name', label: 'VIP Kit Name' },
        { id: 'random_items', label: 'Random Items (Enabled/Disabled)' },
        { id: 'raid_alerts', label: 'Raid Alerts (Enabled/Disabled)' },
        { id: 'linked_role_id', label: 'Linked Role ID' },
        { id: 'vip_role_id', label: 'VIP Role ID' },
      ];

      const components = fields.map((field) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

      modal.addComponents(...components);
      return await interaction.showModal(modal);
    }

    if (button.startsWith('refresh_settings_')) {
      const server_id = button.split('_')[2];

      try {
        const db_server = await client.functions.get_server(client, server_id);
        const guild = await client.guilds.cache.get(db_server.guild_id);
        const settingsChannelId = db_server.settings_channel_id;

        await interaction.deferUpdate();

        const settingsChannel = await guild.channels.cache.get(settingsChannelId);
        if (!settingsChannel) {
          await client.functions.log(
            'warning',
            `\x1b[33;1m[${db_server.identifier}]\x1b[0m Settings channel not found with ID: ${settingsChannelId}`
          );
          return;
        }

        const settingsEmbed = await client.functions.create_settings_embed(
          client,
          db_server.identifier
        );

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_settings_${db_server.identifier}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`refresh_settings_${db_server.identifier}`)
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Primary)
        );

        const messages = await settingsChannel.messages.fetch();
        const lastMessage = messages.find((msg) => msg.embeds.length > 0);

        if (lastMessage) {
          await client.functions.log(
            'debug',
            `\x1b[34;1m[${db_server.identifier}]\x1b[0m Updating existing settings embed message`
          );
          await lastMessage.edit({ embeds: [settingsEmbed], components: [actionRow] });
        } else {
          await client.functions.log(
            'debug',
            `\x1b[34;1m[${db_server.identifier}]\x1b[0m Sending new settings embed message`
          );
          await settingsChannel.send({ embeds: [settingsEmbed], components: [actionRow] });
        }
      } catch (error) {
        console.error('Error while refreshing settings:', error);
        await interaction.reply({
          content: 'An error occurred while refreshing settings.',
          ephemeral: true,
        });
      }
    }
  },
};
