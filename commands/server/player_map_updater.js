// player_map_updater.js
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

function drawMap(players) {
  const canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Draw each player as a dot
  ctx.fillStyle = '#ff0000';
  ctx.font = '16px sans-serif';

  players.forEach(player => {
    const x = player.position.x * (MAP_WIDTH / 3000); // scale from Rust map size
    const y = MAP_HEIGHT - player.position.z * (MAP_HEIGHT / 3000);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(player.display_name || 'Unknown', x + 8, y);
  });

  return canvas.toBuffer();
}

module.exports = {
  startPlayerMapInterval: (client, channelId, serverIdentifier) => {
    setInterval(async () => {
      try {
        const server = await client.rce.servers.get(serverIdentifier);
        if (!server || !server.players || server.players.length === 0) return;

        const mapBuffer = drawMap(server.players);
        const filePath = path.join(__dirname, 'player_map.png');
        fs.writeFileSync(filePath, mapBuffer);

        const attachment = new AttachmentBuilder(filePath);
        const embed = new EmbedBuilder()
          .setTitle(`Live Player Map - ${serverIdentifier}`)
          .setImage('attachment://player_map.png')
          .setColor('Blue')
          .setTimestamp();

        const channel = await client.channels.fetch(channelId);
        await channel.send({ embeds: [embed], files: [attachment] });
      } catch (err) {
        console.error('[PLAYER MAP ERROR]', err);
      }
    }, 2 * 60 * 1000); // every 2 minutes
  }
};
