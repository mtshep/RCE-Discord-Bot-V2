
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const { createPool } = require('mysql2/promise');

require('dotenv').config(); // For local testing

class rce_bot {
  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
    });

    this.client.commands = new Collection();
    this.client.functions = require('./functions.js');

    console.log("[DEBUG] DISCORD_TOKEN present:", !!process.env.DISCORD_TOKEN || !!process.env.DISCORD_BOT_TOKEN);
    console.log("[DEBUG] GPORTAL_EMAIL present:", !!process.env.GPORTAL_EMAIL);
    console.log("[DEBUG] DB HOST:", process.env.DATABASE_HOST || process.env.MYSQLHOST);
    console.log("[DEBUG] DB USER:", process.env.DATABASE_USER || process.env.MYSQLUSER);
    console.log("[DEBUG] DB NAME:", process.env.DATABASE_NAME || process.env.MYSQLDATABASE);
    console.log("[DEBUG] Using MOCK_RCE:", process.env.MOCK_RCE);

    this.init_database();
  }

  async init_database() {
    try {
      this.client.database_connection = createPool({
        host: process.env.DATABASE_HOST || process.env.MYSQLHOST,
        user: process.env.DATABASE_USER || process.env.MYSQLUSER,
        password: process.env.DATABASE_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.DATABASE_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
        port: parseInt(process.env.DATABASE_PORT || process.env.MYSQLPORT || "3306", 10),
      });

      this.client.functions.log('debug', '[DATABASE] Connection pool created');
    } catch (err) {
      this.client.functions.log('error', '[DATABASE] Connection Failed', err);
    }
  }

  async start() {
    this.client.functions.log('info', '[BOT] Starting The Bot...');

    if (process.env.MOCK_RCE === 'true') {
      console.log('[MOCK] Using mocked RCEManager');

      this.client.rce = {
        init: async () => console.log('[MOCK] RCE login simulated'),
        events: {
          on: () => {},
          once: () => {},
        },
        servers: {
          add: async () => console.log('[MOCK] Server added')
        }
      };
    } else {
      const { RCEManager, LogLevel } = require('rce.js');
      this.client.rce = new RCEManager();
      try {
        await this.client.rce.init(
          {
            username: process.env.GPORTAL_EMAIL,
            password: process.env.GPORTAL_PASSWORD,
          },
          { level: LogLevel.Info }
        );
      } catch (error) {
        this.client.functions.log('error', '[RCE] Login Failed:', error.message);
      }
    }

    try {
      await this.client.login(process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN);
      this.client.functions.log('info', '[BOT] Logged into Discord');
    } catch (error) {
      this.client.functions.log('error', '[BOT] Discord Login Failed:', error.message);
    }
  }
}

module.exports = rce_bot;
