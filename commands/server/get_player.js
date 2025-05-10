const { SlashCommandBuilder } = require('discord.js');
const RCE = require('rce.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getplayers')
    .setDescription('Rust Players Location')
   
    ),

  async execute(interaction) {
    const server = interaction.options.getString('server');

    try {
      const command = `global.users`;
      const result = await interaction.client.rce.command.send(
        interaction.client.session,
        process.env.SERVER_ID,
        command
      );
      console.log("📥 Server response:", result);

      function parseUserList(rawInput) {
        // Extract everything after `<slot:"name">` and split by newline
        const cleaned = rawInput
          .split('<slot:"name">')[1] // get text after the header
          .split('\\n')              // split into lines
          .map(name => name.replace(/"/g, '').trim()) // remove quotes and trim
          .filter(name => name && !name.endsWith('users')); // remove empty and count line

        return cleaned;
      }

      const cleaned = parseUserList(result);
      await interaction.reply(`📋 Players:\n${cleaned.join('\n')}`);
    } catch (err) {
      console.error('🔥 Command failed:', err);
      await interaction.reply(`❌ Failed: ${err.message}`);
    }
  }
};