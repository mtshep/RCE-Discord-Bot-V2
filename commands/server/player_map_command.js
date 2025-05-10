// /commands/server/playermap.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder,
} = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playermap')
    .setDescription('Display a live player map with a refresh button.'),

  async execute(interaction, client) {
    const imagePath = path.resolve(`./temp_map_${interaction.guild.id}.png`);

    try {
      await interaction.deferReply();

      // Generate the image (map) first
      await client.functions.generate_player_map(client, interaction.guild.id);

      // Confirm file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Map image was not generated.');
      }

      const attachment = new AttachmentBuilder(imagePath, {
        name: 'player_map.png',
      });

      const embed = new EmbedBuilder()
        .setTitle('Live Player Map')
        .setImage('attachment://player_map.png')
        .setTimestamp()
        .setColor('#2ecc71');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_map_${interaction.guild.id}`)
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (err) {
      await interaction.editReply({
        content: `Failed to generate player map: ${err.message}`,
        ephemeral: true,
      });
    }
  },
};
