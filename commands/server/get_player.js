const { SlashCommandBuilder } = require('discord.js');
const RCE = require('rce.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getplayers')
    .setDescription('Rust Players Location')
    .addStringOption(option =>
      option
        .setName('server')
        .setDescription('The server to query')
        .setRequired(false)
    ),

  async execute(interaction) {
    const server = interaction.options.getString('server');

    try {
      const command = `global.users`;
      const result = await interaction.client.rce.servers.command(
        process.env.SERVER_ID,
        command
      );

      console.log("📥 Server response:", result);

      function parseUserList(rawInput) {
        if (!rawInput.includes('<slot:"name">')) {
          throw new Error('Unexpected server response format.');
        }

        // Extract everything after `<slot:"name">` and split by newline
        const cleaned = rawInput
          .split('<slot:"name">')[1] // Get text after the header
          .split('\\n')              // Split into lines
          .map(name => name.replace(/"/g, '').trim()) // Remove quotes and trim
          .filter(name => name && !name.endsWith('users')); // Remove empty and count line

        return cleaned;
      }

      const cleaned = parseUserList(result);

      if (cleaned.length === 0) {
        await interaction.reply('📋 No players found on the server.');
      } else {
        await interaction.reply(`📋 Players:\n${cleaned.join('\n')}`);
      }
    } catch (err) {
      console.error('🔥 Command failed:', err);
      await interaction.reply(`❌ Failed to fetch players: ${err.message}`);
    }
  }
};