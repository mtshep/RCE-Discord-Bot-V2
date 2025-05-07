  async load_commands() {
    const commandFolders = fs
      .readdirSync('./commands', { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const folder of commandFolders) {
      const commandFiles = fs
        .readdirSync(`./commands/${folder}`)
        .filter((file) => file.endsWith('.js') && !file.startsWith('.')); // Avoid .DS_Store and hidden files

      for (const file of commandFiles) {
        try {
          const command = require(`./commands/${folder}/${file}`);
          if (command.data && command.data.name) {
            this.client.commands.set(command.data.name, command); // Add command to collection
            this.client.functions.log(
              'debug',
              `\x1b[32;1m[COMMANDS]\x1b[0m ${command.data.name} Command Loaded!`
            );
          } else {
            this.client.functions.log(
              'error',
              `\x1b[32;1m[COMMANDS]\x1b[0m ${file} Command Failed To Load!`
            );
          }
        } catch (error) {
          this.client.functions.log(
            'error',
            `[COMMANDS] Error Loading ${file}: ${error}`
          );
        }
      }
    }
  }
