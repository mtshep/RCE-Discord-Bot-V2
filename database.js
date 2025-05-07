const fs = require('fs');
const path = require('path');

class STATS {
  constructor(client) {
    this.client = client;
    this.init();
  }

  async init() {
    const tableDefinitions = [
      {
        name: 'players',
        query: `
          CREATE TABLE IF NOT EXISTS players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            display_name VARCHAR(255),
            discord_id VARCHAR(255) NULL,
            home VARCHAR(255) NULL,
            server VARCHAR(255) NULL,
            region VARCHAR(255) NULL,
            currency INT DEFAULT 0
          )`,
      },
      {
        name: 'kills',
        query: `
          CREATE TABLE IF NOT EXISTS kills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            display_name TEXT DEFAULT NULL,
            victim TEXT DEFAULT NULL,
            type TEXT DEFAULT NULL,
            server VARCHAR(255) NULL,
            region VARCHAR(255) NULL,
            time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
      },
      {
        name: 'bans',
        query: `
          CREATE TABLE IF NOT EXISTS bans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            display_name VARCHAR(255),
            server VARCHAR(255) NULL,
            region VARCHAR(255) NULL,
            reason VARCHAR(255) NULL
          )`,
      },
      {
        name: 'chat_blacklist',
        query: `
          CREATE TABLE IF NOT EXISTS chat_blacklist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            display_name VARCHAR(255),
            reason VARCHAR(255) NULL
          )`,
      },
      {
        name: 'kit_redemptions',
        query: `
          CREATE TABLE kit_redemptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            display_name VARCHAR(255) NOT NULL,
            type VARCHAR(255) NOT NULL,
            server VARCHAR(255) NOT NULL,
            region VARCHAR(255) NOT NULL,
            last_redeemed INT NOT NULL
          );`,
      },
      {
        name: 'shop',
query: `
  CREATE TABLE IF NOT EXISTS shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    reward_type ENUM('role', 'kit', 'code') NOT NULL,
    reward_value VARCHAR(100),
    issue VARCHAR(100),
    quantity INT DEFAULT 0,
    available_on_shop BOOLEAN DEFAULT FALSE
  );
`,
        
   
        
      },
      {
        name: 'servers',
        query: `
          CREATE TABLE IF NOT EXISTS servers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            region VARCHAR(50) NOT NULL,
            server_id BIGINT NOT NULL,
            refresh_players INT DEFAULT 2,
            rf_broadcasting INT DEFAULT 1,
            bradley_feeds INT DEFAULT 1,
            heli_feeds INT DEFAULT 1,
            random_items BOOLEAN DEFAULT FALSE,
            guild_owner VARCHAR(255) NOT NULL,
            guild_id VARCHAR(255) NOT NULL,
            category_id VARCHAR(255) NOT NULL,
            linked_role_id VARCHAR(255) NOT NULL,
            link_channel_id VARCHAR(255) NOT NULL,
            kill_feeds_channel_id VARCHAR(255) NOT NULL,
            events_channel_id VARCHAR(255) NOT NULL,
            stats_channel_id VARCHAR(255) NOT NULL,
            chat_logs_channel_id VARCHAR(255) NOT NULL,
            item_spawning_channel_id VARCHAR(255) NOT NULL,
            kits_logs_channel_id VARCHAR(255) NOT NULL,
            team_logs_channel_id VARCHAR(255) NOT NULL,
            teleport_logs_channel_id VARCHAR(255) NOT NULL,
            shop_channel_id VARCHAR(255) NOT NULL,
            settings_channel_id VARCHAR(255) NOT NULL,
            npc_kill_points int NOT NULL,
            npc_death_points int NOT NULL,
            player_kill_points int NOT NULL,
            player_death_points int NOT NULL,
            suicide_points int NOT NULL,
            outpost VARCHAR(255) NOT NULL,
            bandit VARCHAR(255) NOT NULL,
            loot_scale INT DEFAULT 1,
            hourly_kit_name VARCHAR(255) NULL,
            vip_kit_name VARCHAR(255) NULL,
            vip_role_id VARCHAR(255) NULL,
            enabled int(11) NOT NULL DEFAULT 1
          );`,
      },
    ];

    const checkTableExists = async (tableName) => {
      try {
        await this.client.database_connection.execute(
          `SELECT 1 FROM \`${tableName}\` LIMIT 1`
        );
        return true;
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return false;
        }
        throw err;
      }
    };

    const tablePromises = tableDefinitions.map(async ({ name, query }) => {
      try {
        const exists = await checkTableExists(name);
        if (exists) {
          await this.client.functions.log(
            'debug',
            `\x1b[34;1m[DATABASE]\x1b[0m ${name.charAt(0) + name.slice(1)} Table Already Exists!`
          );
        } else {
          await this.client.database_connection.execute(query);
          await this.client.functions.log(
            'debug',
            `\x1b[34;1m[DATABASE]\x1b[0m ${name.charAt(0) + name.slice(1)} Table Created!`
          );
        }
      } catch (err) {
        await this.client.functions.log(
          'error',
          `\x1b[34;1m[DATABASE]\x1b[0m MySQL Create ${name.charAt(0) + name.slice(1)} Table Error: ${err.message}`
        );
        throw err;
      }
    });

    await Promise.all(tablePromises)
      .then(async () => {
        await this.client.functions.log(
          'info',
          '\x1b[34;1m[DATABASE]\x1b[0m All Tables Checked/Created Successfully!'
        );
        await this.populateShopItems();
      })
      .catch(async (err) => {
        await this.client.functions.log(
          'error',
          '\x1b[34;1m[DATABASE]\x1b[0m Error Creating One Or More Tables: ' + err.message
        );
        throw err;
      });
  }

  async function populateShopItemsFromJSON() {
    const path = require('path');
    const fs = require('fs');
  
    try {
      const filePath = path.join(__dirname, 'items.json');
      const rawData = fs.readFileSync(filePath);
      const items = JSON.parse(rawData);
  
      for (const item of items) {
        await client.database_connection.execute(
          `INSERT INTO shop_items (name, description, reward_type, reward_value, price, issue, quantity, available_on_shop)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.name,
            item.description || '',
            item.reward_type || 'kit',
            item.reward_value || item.name,
            item.price || 0,
            item.issue || '',
            item.quantity || 0,
            item.available_on_shop || false,
          ]
        );
      }
  
      console.log('[DATABASE] shop_items populated successfully.');
    } catch (err) {
      console.error('[DATABASE] Failed to populate shop_items:', err.message);
    }
  }













  

  
  
  
  
  
  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  
  
  


module.exports = STATS;
