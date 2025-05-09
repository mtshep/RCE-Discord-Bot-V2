const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kits')
    .setDescription('View and inspect available kits for a selected server'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const playerName = interaction.member.displayName;

    console.log('[KITS] Fetching servers for guild:', guildId);

    let servers;
    try {
      servers = await interaction.client.functions.get_servers_for_guild(interaction.client, guildId);
    } catch (error) {
      console.error('[KITS] Failed to get servers for guild:', error);
      return await interaction.reply({
        content: '⚠️ Failed to retrieve your linked servers.',
        ephemeral: true,
      });
    }

    if (!servers.length) {
      return await interaction.reply({
        content: '⚠️ No servers found for this guild.',
        ephemeral: true,
      });
    }

    const serverOptions = servers.map(server =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${server.identifier} (${server.region})`)
        .setValue(server.identifier)
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('kits_server_select')
      .setPlaceholder('Select a server to view its kits')
      .addOptions(serverOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: 'Please choose a server to view its available kits:',
      components: [row],
      ephemeral: true,
    });
  }
};
