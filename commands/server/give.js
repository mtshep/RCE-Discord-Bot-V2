const { SlashCommandBuilder } = require('discord.js');
const { RCE } = require('rce.js');

const rce = new RCE();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveitem')
    .setDescription('Give an item to a Rust Console Edition player')
    .addStringOption(option =>
      option.setName('player')
        .setDescription('Exact player name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item shortname (e.g., rifle.ak)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of the item')
        .setRequired(true)),
  
  async execute(interaction) {
    const player = interaction.options.getString('player');
    const item = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount');

    try {
      await interaction.reply(`📦 Giving ${amount}x \`${item}\` to \`${player}\`...`);
      
      const session = await rce.login(process.env.GPORTAL_EMAIL, process.env.GPORTAL_PASSWORD);
      const command = `inventory.give "${player}" "${item}" ${amount}`;
      const result = await rce.sendCommand(session, process.env.SERVER_ID, command);

      await interaction.editReply(`✅ Done: \`${command}\`\n🖥️ Server Response: ${result.message || 'Success'}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply(`❌ Failed: ${err.message}`);
    }
  }
};