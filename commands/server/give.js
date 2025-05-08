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
        const shortName = itemId;
        const memberName = player;
  
        try {
          await client.rce.servers.command(serverIdentifier, `inventory.give ${memberName} ${itemFormatted} ${quantity}`);
  
          const itemImageUrl = await client.functions.get_item_image(itemId);
  
          await client.functions.send_embed(
            client,
            serverIdentifier,
            `✅ ${serverIdentifier} - Item Granted`,
            `The following item was successfully given to ${memberName}:`,
            [
              { name: 'Receiver', value: `👤 ${memberName}`, inline: true },
              {
                name: 'Time',
                value: `🕜 <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
              },
              { name: 'Item Granted', value: `***${shortName}***`, inline: true },
              { name: 'Quantity', value: `**${quantity}**`, inline: true },
              { name: 'Server ID', value: `\`${serverIdentifier}\``, inline: true },
            ],
            itemImageUrl
          );
  
          await interaction.reply({ content: `✅ Gave ${quantity}x ${shortName} to ${memberName} on server ${serverIdentifier}.`, ephemeral: true });
        } catch (error) {
          await interaction.reply({ content: `❌ Failed to give item on server ${serverIdentifier}.`, ephemeral: true });
        }
      }
    },
  };