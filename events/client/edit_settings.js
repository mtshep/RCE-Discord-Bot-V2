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

      // Create a modal for editing server settings
      const modal = new ModalBuilder()
        .setCustomId(`edit_modal_${server_id}`)
        .setTitle(`Edit Settings - ${server_id}`);

      const npcKillPointsInput = new TextInputBuilder()
        .setCustomId('npc_kill_points')
        .setLabel('NPC Kill Points')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const npcDeathPointsInput = new TextInputBuilder()
        .setCustomId('npc_death_points')
        .setLabel('NPC Death Points')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const playerKillPointsInput = new TextInputBuilder()
        .setCustomId('player_kill_points')
        .setLabel('Player Kill Points')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const playerDeathPointsInput = new TextInputBuilder()
        .setCustomId('player_death_points')
        .setLabel('Player Death Points')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const suicidePointsInput = new TextInputBuilder()
        .setCustomId('suicide_points')
        .setLabel('Suicide Points')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(npcKillPointsInput),
        new ActionRowBuilder().addComponents(npcDeathPointsInput),
        new ActionRowBuilder().addComponents(playerKillPointsInput),
        new ActionRowBuilder().addComponents(playerDeathPointsInput),
        new ActionRowBuilder().addComponents(suicidePointsInput)
      );

      return await interaction.showModal(modal);
    } else if (button.startsWith('refresh_settings_')) {
      const server_id = button.split('_')[2];

      try {
        const db_server = await client.functions.get_server(client, server_id);
        const guild = await client.guilds.cache.get(db_server.guild_id);
        const settingsChannelId = db_server.settings_channel_id;

        await interaction.deferUpdate();

        try {
          const settingsChannel = await guild.channels.cache.get(settingsChannelId);
          if (!settingsChannel) {
            await client.functions.log('warning', `\x1b[33;1m[${db_server.identifier}]\x1b[0m Settings channel not found with ID: ${settingsChannelId}`);
            return;
          }

          await client.functions.log('debug', `\x1b[34;1m[${db_server.identifier}]\x1b[0m Fetching settings channel with ID: ${settingsChannelId}`);

          const settingsEmbed = await client.functions.create_settings_embed(client, db_server.identifier);
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
            await client.functions.log('debug', `\x1b[34;1m[${db_server.identifier}]\x1b[0m Updating existing settings embed message`);
            await lastMessage.edit({ embeds: [settingsEmbed], components: [actionRow] });
          } else {
            await client.functions.log('debug', `\x1b[34;1m[${db_server.identifier}]\x1b[0m Sending new settings embed message`);
            await settingsChannel.send({ embeds: [settingsEmbed], components: [actionRow] });
          }
        } catch (error) {
          await client.functions.log('error', `\x1b[31;1m[${db_server.identifier}]\x1b[0m Error handling the settings channel: ${error.message}`);
          console.error('Settings Channel Error:', error);
        }
      } catch (error) {
        console.error('Error while refreshing settings:', error);
        await interaction.reply({ content: 'An error occurred while refreshing settings.', ephemeral: true });
      }
    }
  },
};
