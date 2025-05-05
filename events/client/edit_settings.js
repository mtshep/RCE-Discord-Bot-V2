// Sectioned Settings Flow for Discord Bot using Discord.js v14
// File: sectioned_settings.js

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const sessions = new Map(); // Tracks user edit session states

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const [action, serverId, step] = interaction.customId.split('_');

    if (action === 'edit' && step === 'start') {
      sessions.set(interaction.user.id, { step: 1, serverId });
      await showSettingsPage(interaction, 1, serverId);
    } else if (action === 'next' || action === 'back') {
      const newStep = action === 'next' ? parseInt(step) + 1 : parseInt(step) - 1;
      sessions.get(interaction.user.id).step = newStep;
      await showSettingsPage(interaction, newStep, serverId);
    } else if (action === 'submit') {
      const current = sessions.get(interaction.user.id);
      await showSettingsModal(interaction, parseInt(step), current.serverId);
    } else if (interaction.isModalSubmit()) {
      const [_, serverId, step] = interaction.customId.split('_');
      const values = Object.fromEntries(
        interaction.fields.fields.map((f) => [f.customId, f.value])
      );

      await client.functions.update_server_settings(serverId, values); // Assumes function exists
      await interaction.reply({
        content: `✅ Settings saved for page ${step}!`,
        ephemeral: true,
      });
    }
  },
};

async function showSettingsPage(interaction, step, serverId) {
  const embed = new EmbedBuilder()
    .setTitle(`Edit Settings - Page ${step}`)
    .setColor('#5865F2')
    .setFooter({ text: `Editing Server: ${serverId}` });

  const buttons = new ActionRowBuilder().addComponents(
    step > 1
      ? new ButtonBuilder()
          .setCustomId(`back_${serverId}_${step}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId('disabled_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(true),

    new ButtonBuilder()
      .setCustomId(`submit_${serverId}_${step}`)
      .setLabel('Edit This Page')
      .setStyle(ButtonStyle.Primary),

    step < 4
      ? new ButtonBuilder()
          .setCustomId(`next_${serverId}_${step}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId('disabled_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  embed.setDescription(getFieldsPreview(step));

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    ephemeral: true,
  });
}

function getFieldsPreview(step) {
  switch (step) {
    case 1:
      return `• NPC Kill Points\n• NPC Death Points\n• Player Kill Points\n• Player Death Points\n• Suicide Points`;
    case 2:
      return `• Extended Feeds\n• Random Items\n• Raid Alerts\n• Loot Scale`;
    case 3:
      return `• Outpost\n• Bandit Camp\n• Hourly Kit Name\n• VIP Kit Name`;
    case 4:
      return `• Linked Role ID\n• VIP Role ID`;
  }
}

async function showSettingsModal(interaction, step, serverId) {
  const modal = new ModalBuilder()
    .setCustomId(`save_${serverId}_${step}`)
    .setTitle(`Edit Settings - Page ${step}`);

  const rows = [];

  const field = (id, label, style = TextInputStyle.Short, required = false) =>
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setRequired(required);

  switch (step) {
    case 1:
      rows.push(
        new ActionRowBuilder().addComponents(field('npc_kill', 'NPC Kill Points')),
        new ActionRowBuilder().addComponents(field('npc_death', 'NPC Death Points')),
        new ActionRowBuilder().addComponents(field('player_kill', 'Player Kill Points')),
        new ActionRowBuilder().addComponents(field('player_death', 'Player Death Points')),
        new ActionRowBuilder().addComponents(field('suicide', 'Suicide Points'))
      );
      break;
    case 2:
      rows.push(
        new ActionRowBuilder().addComponents(field('extended_feeds', 'Extended Feeds (Enabled/Disabled)')),
        new ActionRowBuilder().addComponents(field('random_items', 'Random Items (Enabled/Disabled)')),
        new ActionRowBuilder().addComponents(field('raid_alerts', 'Raid Alerts (Enabled/Disabled)')),
        new ActionRowBuilder().addComponents(field('loot_scale', 'Loot Scale (e.g. 1x)'))
      );
      break;
    case 3:
      rows.push(
        new ActionRowBuilder().addComponents(field('outpost', 'Outpost (Enabled/Disabled)')),
        new ActionRowBuilder().addComponents(field('bandit', 'Bandit Camp (Enabled/Disabled)')),
        new ActionRowBuilder().addComponents(field('hourly_kit', 'Hourly Kit Name')),
        new ActionRowBuilder().addComponents(field('vip_kit', 'VIP Kit Name'))
      );
      break;
    case 4:
      rows.push(
        new ActionRowBuilder().addComponents(field('linked_role', 'Linked Role ID')),
        new ActionRowBuilder().addComponents(field('vip_role', 'VIP Role ID'))
      );
      break;
  }

  modal.addComponents(rows.slice(0, 5)); // Discord allows max 5 fields
  await interaction.showModal(modal);
}
