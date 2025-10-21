const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

class CommandHandler {
  constructor(client) {
    this.client = client;
    this.commands = [];
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      this.client.commands.set(command.data.name, command);
      this.commands.push(command.data.toJSON());
    }

    this.registerCommands();
  }

  async registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log('🔄 Registering slash commands...');
      await rest.put(
        Routes.applicationCommands(this.client.user.id),
        { body: this.commands }
      );
      console.log('✅ Slash commands registered successfully!');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }
}

module.exports = CommandHandler;
