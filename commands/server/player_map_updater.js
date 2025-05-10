// player_map_updater.js
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

async function drawMap(players) {
  const image = new Jimp(MAP_WIDTH, MAP_HEIGHT, '#1e1e1e');

  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  // Draw border
  image.scan(0, 0, MAP_WIDTH, 1, (x, y, idx) => image.setPixelColor(0xffffffff, x, y)); // top
  image.scan(0, MAP_HEIGHT - 1, MAP_WIDTH, 1, (x, y, idx) => image.setPixelColor(0xffffffff, x, y)); // bottom
  image.scan(0, 0, 1, MAP_HEIGHT, (x, y, idx) => image.setPixelColor(0xffffffff, x, y)); // left
  image.scan(MAP_WIDTH - 1, 0, 1, MAP_HEIGHT, (x, y, idx) => image.setPixelColor(0xffffffff, x, y)); // right

  for (const player of players) {
    const x = player.position.x * (MAP_WIDTH / 3000);
    const y = MAP_HEIGHT - player.position.z * (MAP_HEIGHT / 3000);

    // Draw red dot (5x5)
    image.scan(Math.round(x) - 2, Math.round(y) - 2, 5, 5, (xx, yy, idx) => {
      if (xx >= 0 && xx < MAP_WIDTH && yy >= 0 && yy < MAP_HEIGHT) {
        image.setPixelColor(0xffff0000, xx, yy);
      }
    });
    image.print(font, Math.round(x) + 6, Math.round(y) - 8, player.display_name || 'Unknown');
  }

  return await image.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = {
  startPlayerMapInterval: (client, channelId, serverIdentifier) => {
    setInterval(async () => {
      try {
        const server = await client.rce.servers.get(serverIdentifier);
        if (!server || !server.players || server.players.length === 0) return;

        const mapBuffer = await drawMap(server.players);
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
