const { SlashCommandBuilder } = require('discord.js');
const RCE = require('rce.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getplayers')
    .setDescription('Rust Players Location')
    .addStringOption(option =>
      option
        .setName('server')
        .setDescription('Select a server')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const server = interaction.options.getString('server');

    if (!server) {
      await interaction.reply('❌ No server selected.');
      return;
    }

    try {
      const command = `global.playerlist`;
      const result = await interaction.client.rce.servers.command(
        server,
        command
      );

      if (!result.ok || !result.response) {
        await interaction.reply('❌ Failed to fetch players: Invalid server response.');
        return;
      }

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

      console.log('[DEBUG] Raw response from server:', result.response);
      const cleaned = parseUserList(result.response);

      if (cleaned.length === 0) {
        await interaction.reply('📋 No players found on the server.');
      } else {
        const formattedList = cleaned.map((name, index) => `\`${index + 1}.\` ${name}`).join('\n');
        await interaction.reply({ content: `📋 **Players on \`${server}\`**:\n${formattedList}`, ephemeral: true });
      }
    } catch (err) {
      console.error('🔥 Command failed:', err);
      await interaction.reply(`❌ Failed to fetch players: ${err.message}`);
    }
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    // Get servers from the database
    const [rows] = await interaction.client.database_connection.query(`SELECT identifier FROM servers WHERE enabled = 1`);

    const choices = rows.map(row => row.identifier);
    const filtered = choices
      .filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25); // Max 25 choices allowed

    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
    );
  }
};