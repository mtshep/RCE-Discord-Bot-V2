const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } = require('discord.js');
  
const fs = require('fs');
const path = require('path');

function load_commands(client) {
  const commandFolders = fs.readdirSync('./commands').filter(folder => {
    const folderPath = path.join('./commands', folder);
    return fs.statSync(folderPath).isDirectory(); // Only include directories
  });

  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./commands/${folder}/${file}`);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[WARNING] The command at ./commands/${folder}/${file} is missing "data" or "execute".`);
      }
    }
  }
}

module.exports = {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Browse and buy items using Dumz Dollars'),
  
    async execute(interaction, client) {
      const userId = interaction.user.id;
  
      // Fetch player info
      const [playerRows] = await client.database_connection.query(
        'SELECT * FROM players WHERE discord_id = ?',
        [userId]
      );
  
      if (!playerRows.length) {
        return interaction.reply({
          content: '⚠️ You must be linked to use the shop.',
          ephemeral: true,
        });
      }
  
      const player = playerRows[0];
  
      // Get all available items
      const [items] = await client.database_connection.query(
        'SELECT * FROM shop_items WHERE available_on_shop = TRUE'
      );
  
      if (!items.length) {
        return interaction.reply({ content: '🚫 No items are currently for sale.', ephemeral: true });
      }
  
      // Group by category
      const categories = [...new Set(items.map(item => item.category))];
      const pages = categories.map(category => ({
        category,
        items: items.filter(item => item.category === category),
      }));
  
      let currentPage = 0;
      const basket = [];
  
      const renderEmbed = (page) => {
        const embed = new EmbedBuilder()
          .setTitle(`🛒 ${pages[page].category} Shop`)
          .setDescription(`Select an item to add to your basket.\nYour Dumz Balance: **${player.currency}**`)
          .setFooter({ text: `Page ${page + 1} of ${pages.length}` })
          .setColor('Green');
  
        for (const item of pages[page].items.slice(0, 10)) {
          embed.addFields({
            name: `${item.name} - ${item.price} 💰`,
            value: item.description || item.shortname || 'No description',
          });
        }
  
        return embed;
      };

      const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');

// Fetch available servers for the guild
const [serverRows] = await client.database_connection.query(
  'SELECT identifier, region, server_id FROM servers WHERE guild_id = ?',
  [interaction.guild.id]
);

if (serverRows.length === 0) {
  return await interaction.reply({
    content: 'No linked servers found for this Discord. Please link a server first.',
    ephemeral: true,
  });
}

// Build dropdown options from server list
const serverOptions = serverRows.map(server => ({
  label: `${server.identifier} (${server.region})`,
  value: `${server.server_id}|${server.region}`, // encode values
}));

const serverEmbed = new EmbedBuilder()
  .setColor('Blurple')
  .setTitle('🖥 Select Your Server')
  .setDescription('Choose the server you want to use for purchases.')
  .setFooter({ text: 'Dumz Paradise Shop' });

const selectMenu = new StringSelectMenuBuilder()
  .setCustomId('select_shop_server')
  .setPlaceholder('Select a server...')
  .addOptions(serverOptions);

await interaction.reply({
  embeds: [serverEmbed],
  components: [new ActionRowBuilder().addComponents(selectMenu)],
  ephemeral: true,
});
  
      const renderSelectMenu = (page) => {
        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_item')
            .setPlaceholder('Select an item to add to basket')
            .addOptions(
              pages[page].items.slice(0, 25).map(item => ({
                label: item.name,
                value: item.id.toString(),
                description: `Price: ${item.price} 💰`,
              }))
            )
        );
      };
  
      const renderButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('checkout').setLabel('✅ Checkout').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('next').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary)
        );
      };
  
      await interaction.reply({
        embeds: [renderEmbed(currentPage)],
        components: [renderSelectMenu(currentPage), renderButtons()],
        ephemeral: true,
      });
  
      const collector = interaction.channel.createMessageComponentCollector({
        time: 120_000,
        filter: (i) => i.user.id === userId,
      });
  
      collector.on('collect', async (i) => {
        if (i.customId === 'next') {
          currentPage = (currentPage + 1) % pages.length;
          await i.update({
            embeds: [renderEmbed(currentPage)],
            components: [renderSelectMenu(currentPage), renderButtons()],
          });
        } else if (i.customId === 'prev') {
          currentPage = (currentPage - 1 + pages.length) % pages.length;
          await i.update({
            embeds: [renderEmbed(currentPage)],
            components: [renderSelectMenu(currentPage), renderButtons()],
          });
        } else if (i.customId === 'select_item') {
          const selectedId = parseInt(i.values[0]);
          const item = items.find(it => it.id === selectedId);
          if (!item) {
            return await i.reply({ content: '❌ Invalid item selected.', ephemeral: true });
          }
          basket.push(item);
          await i.reply({ content: `🛍️ Added **${item.name}** to basket!`, ephemeral: true });
        } else if (i.customId === 'checkout') {
          const total = basket.reduce((sum, item) => sum + item.price, 0);
          if (player.currency < total) {
            return i.reply({ content: `❌ Not enough Dumz Dollars! You need ${total}, but only have ${player.currency}.`, ephemeral: true });
          }
  
          try {
            await client.database_connection.query(
              'UPDATE players SET currency = currency - ? WHERE id = ?',
              [total, player.id]
            );
          } catch (err) {
            console.error('Failed to deduct currency:', err);
            return i.reply({ content: '❌ Failed to process your purchase. Please try again later.', ephemeral: true });
          }
  
          for (const item of basket) {
            if (item.reward_type === 'kit') {
              const server = await client.functions.get_server(client, player.server);
              await client.rce.servers.command(server.identifier, `kit.give "${player.display_name}" "${item.reward_value}"`);
            }
          }
  
          collector.stop();
          return i.update({
            content: `✅ You successfully purchased:\n${basket.map(i => `• ${i.name} (${i.price} 💰)`).join('\n')}\nNew balance: **${player.currency - total}** 💰`,
            embeds: [],
            components: [],
          });
        }
      });
  
      collector.on('end', async () => {
        await interaction.editReply({
          content: '⏳ Shop session expired. Please use `/shop` to start again.',
          embeds: [],
          components: [],
        });
      });
    },
  };