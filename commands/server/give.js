const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { RCE } = require('rce.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const rce = new RCE();
let gportalSession;

// Login to GPORTAL
async function connectToRCE() {
  gportalSession = await rce.login(process.env.GPORTAL_EMAIL, process.env.GPORTAL_PASSWORD);
  console.log('✅ Logged into GPORTAL');
}

// Define the slash command
const giveCommand = new SlashCommandBuilder()
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
      .setRequired(true));

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await connectToRCE();

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: [giveCommand.toJSON()]
  });

  console.log('✅ Slash command registered.');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'giveitem') {
    const player = interaction.options.getString('player');
    const item = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount');

    await interaction.reply(`📦 Giving ${amount}x \`${item}\` to \`${player}\`...`);

    try {
      const command = `inventory.give "${player}" "${item}" ${amount}`;
      const result = await rce.sendCommand(gportalSession, process.env.SERVER_ID, command);

      await interaction.editReply(`✅ Done: \`${command}\`\n🖥️ Server Response: ${result.message || 'Success'}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply(`❌ Failed: ${err.message}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);