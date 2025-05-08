const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('give')
      .setDescription('Test giving an item to a player')
      .addStringOption(opt =>
        opt.setName('player').setDescription('In-game name').setRequired(true))
      .addStringOption(opt =>
        opt.setName('item_id').setDescription('Item shortname or numeric ID').setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('quantity').setDescription('Quantity to give').setRequired(true))
      .addStringOption(opt =>
        opt.setName('server_id').setDescription('RCE server identifier (optional)').setRequired(false)),
  
    async execute(interaction, client) {
      const player = interaction.options.getString('player');
      const itemId = interaction.options.getString('item_id');
      const quantity = interaction.options.getInteger('quantity');
      const serverIdOption = interaction.options.getString('server_id');
  
      const serverIdentifier = serverIdOption;
      if (!serverIdentifier) {
        // Fetch servers
        const [servers] = await client.database_connection.query('SELECT name, identifier FROM servers');
        if (!servers.length) {
          return interaction.reply({ content: '❌ No servers found.', ephemeral: true });
        }
  
        // Ask user to select a server
        const serverOptions = servers.map(s => ({
          label: `${s.name} (${s.identifier})`,
          value: s.identifier,
        }));
  
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_server')
            .setPlaceholder('Select a server')
            .addOptions(serverOptions)
        );
  
        await interaction.reply({
          content: '🌐 Choose a server to send the item:',
          components: [row],
          ephemeral: true,
        });
  
        const selection = await interaction.channel.awaitMessageComponent({
          filter: i => i.user.id === interaction.user.id && i.customId === 'select_server',
          time: 60_000,
        });
  
        return await handleGive(selection.values[0]);
      }
  
      await handleGive(serverIdentifier);
  
      async function handleGive(serverIdentifier) {
        const itemFormatted = isNaN(itemId) ? `"${itemId}"` : itemId;
  
        try {
          console.log(`[GIVE TEST] ➤ Sending: item.give "${player}" ${itemFormatted} ${quantity} to ${serverIdentifier}`);
          const result = await client.rce.servers.command(serverIdentifier, `item.give "${player}" ${itemFormatted} ${quantity}`);
          await interaction.reply({ content: `✅ Sent ${quantity} of ${itemId} to ${player} on ${serverIdentifier}.`, ephemeral: true });
          console.log(`[GIVE TEST] ✅ RCE result:`, result);
        } catch (err) {
          console.error(`[GIVE TEST] ❌ Error while sending to ${serverIdentifier}:`, err.message, err.stack);
          await interaction.reply({ content: `❌ Failed to give item: ${err.message}`, ephemeral: true });
        }
      }
    },
  };