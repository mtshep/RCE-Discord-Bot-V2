
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const { RCEManager, LogLevel, RCEIntent } = require('rce.js');
const stats = require('./database.js');
const { createPool } = require('mysql2/promise');

class rce_bot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      allowedMentions: {
        parse: ['roles', 'users', 'everyone'],
        repliedUser: true,
      },
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    });

    this.client.functions = require('./functions.js');
    this.load_items();
    this.client.auto_messages = require('./auto_messages.json');
    this.client.commands = new Collection();
    this.client.server_information = new Map();
    this.client.events = new Collection();
    this.init_database();
    this.client.player_stats = new stats(this.client);
  }

  async load_items() {
    try {
      this.client.items = await this.client.functions.load_items(this.client);
    } catch (err) {
      this.client.functions.log('error', `[ITEMS] Failed To Load Items: ${err.message}`);
    }
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
      this.client.functions.log('debug', '[DATABASE] Connection Established!');
    } catch (err) {
      this.client.functions.log('error', '[DATABASE] Connection Failed!', err);
    }
  }

  async load_commands() {
    const command_folders = fs.readdirSync('./commands');
    for (const folder of command_folders) {
      const command_files = fs.readdirSync(`./commands/${folder}`).filter((file) => file.endsWith('.js'));
      for (const file of command_files) {
        try {
          const command = require(`./commands/${folder}/${file}`);
          if (command.data && command.data.name) {
            this.client.commands.set(command.data.name, command);
            this.client.functions.log('debug', `[COMMANDS] ${command.data.name} Command Loaded!`);
          } else {
            this.client.functions.log('error', `[COMMANDS] ${file} Command Failed To Load!`);
          }
        } catch (error) {
          this.client.functions.log('error', `[COMMANDS] Error Loading ${file}: ${error}`);
        }
      }
    }
  }

  async load_rce_events() {
    const eventFiles = fs.readdirSync('./events/rce').filter((file) => file.endsWith('.js'));
    for (const file of eventFiles) {
      try {
        const event = require(`./events/rce/${file}`);
        this.client.functions.log('debug', `[RCE EVENT] ${this.client.functions.get_event_name(event.name)} Event Loaded!`);
        if (event.once) {
          this.client.rce.events.once(event.name, (...args) => event.execute(...args, this.client.rce.events, this.client));
        } else {
          this.client.rce.events.on(event.name, (...args) => event.execute(...args, this.client.rce.events, this.client));
        }
      } catch (error) {
        this.client.functions.log('error', `[RCE EVENT] Failed To Load Event ${file}: ${error.message}`);
      }
    }
  }

  async load_events() {
    this.client.functions.log('debug', '[BOT] Loading Events...');
    const eventFiles = fs.readdirSync('./events/client').filter((file) => file.endsWith('.js'));
    for (const file of eventFiles) {
      try {
        const event = require(`./events/client/${file}`);
        this.client.functions.log('debug', `[DISCORD EVENT] ${this.client.functions.get_event_name(event.name)} Event Loaded!`);
        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args, this.client));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args, this.client));
        }
      } catch (error) {
        this.client.functions.log('error', `[DISCORD EVENT] Failed To Load Event ${file}: ${error.message}`);
      }
    }
  }

  async fetch_servers() {
    try {
      const [rows] = await this.client.database_connection.execute('SELECT * FROM servers');
      this.client.servers = (
        await Promise.all(
          rows.map(async (row) => {
            if (!row.enabled) return null;
            await this.client.rce.servers.add({
              identifier: row.identifier,
              region: row.region,
              serverId: row.server_id,
              intents: [RCEIntent.All],
              playerRefreshing: true,
              radioRefreshing: true,
              extendedEventRefreshing: true,
            });
            return row;
          })
        )
      ).filter(Boolean);
      this.client.functions.log('debug', `[BOT] ${this.client.servers.length} Servers Successfully Fetched From The Database!`);
    } catch (error) {
      this.client.functions.log('error', '[BOT] Error Fetching Servers: ' + error.message);
    }
  }

  async start() {
    this.client.functions.log('info', '[BOT] Starting The Bot...');
    await this.load_commands();

    try {
      this.client.rce = new RCEManager();
      await this.client.rce.init(
        {
          username: process.env.GPORTAL_EMAIL,
          password: process.env.GPORTAL_PASSWORD,
        },
        {
          level: LogLevel.Info,
          
        }
      );
      this.client.functions.log('info', '[RCE] Successfully authenticated with GPortal.');
      await this.fetch_servers();
      await this.load_events();
      await this.load_rce_events();
      await this.client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
      await this.register_commands();
      this.client.functions.log('info', '[BOT] Logged into Discord');
    } catch (error) {
      this.client.functions.log('error', '[BOT] Error During Start: ' + error.message);
    }
  }

  async register_commands() {
    const commands = Array.from(this.client.commands.values()).map((command) => command.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || process.env.TOKEN);
    try {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      this.client.functions.log('debug', '[COMMANDS] Registered Commands With Discord API!');
    } catch (error) {
      this.client.functions.log('error', '[COMMANDS] Failed To Register Commands: ' + error.message);
    }
  }
}

module.exports = rce_bot;
