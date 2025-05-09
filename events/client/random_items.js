async execute(interaction) {
  const player = interaction.options.getString('player');
  const item = interaction.options.getString('item');
  const amount = interaction.options.getInteger('amount');

  try {
    console.log("↪ player:", player, "item:", item, "amount:", amount);
    await interaction.reply(`📦 Giving ${amount}x \`${item}\` to \`${player}\`...`);

    const command = `inventory.give "${player}" "${item}" ${amount}`;
    const result = await interaction.client.rce.command.send(
      interaction.client.session,
      process.env.SERVER_ID,
      command
    );
    console.log("📥 Server response:", result);

    await interaction.editReply(`✅ Done: \`${command}\`\n🖥️ Server Response: ${result.message || 'Success'}`);
  } catch (err) {
    console.error('🔥 Command failed:', err);
    await interaction.editReply(`❌ Failed: ${err.message}`);
  }
}
