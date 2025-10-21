const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with the leveling bot commands')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Specific command to get help for')
        .setRequired(false)
        .addChoices(
          { name: 'rank', value: 'rank' },
          { name: 'leaderboard', value: 'leaderboard' },
          { name: 'background', value: 'background' },
          { name: 'xp', value: 'xp' },
          { name: 'level', value: 'level' },
          { name: 'config', value: 'config' },
          { name: 'ping', value: 'ping' }
        )
    ),
  async execute(interaction, client) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      await this.showCommandHelp(interaction, commandName);
    } else {
      await this.showGeneralHelp(interaction);
    }
  },

  async showGeneralHelp(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎮 Leveling Bot Help')
      .setDescription('Welcome to the Leveling Bot! Here are all available commands:')
      .setColor(0x00FF88)
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '👤 User Commands',
          value: 
            '`/rank` - View your rank card\n' +
            '`/leaderboard` - Check server leaderboard\n' +
            '`/background` - Manage rank card background\n' +
            '`/help` - Show this help menu'
        },
        {
          name: '⚙️ Admin Commands',
          value:
            '`/xp` - Manage user XP\n' +
            '`/level` - Manage user levels\n' +
            '`/config` - Configure bot settings'
        },
        {
          name: '🔧 Utility Commands',
          value: '`/ping` - Check bot latency'
        },
        {
          name: '📖 Need More Help?',
          value: 'Use `/help [command]` for detailed information about a specific command!\nExample: `/help rank`'
        }
      )
      .setFooter({ text: 'Leveling Bot • Earn XP by chatting!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showCommandHelp(interaction, commandName) {
    const commandHelp = this.getCommandHelp(commandName);
    
    const embed = new EmbedBuilder()
      .setTitle(`📖 /${commandName} Command Help`)
      .setColor(0x00FF88)
      .setFooter({ text: '[] = required, <> = optional' });

    // Add description and usage
    embed.setDescription(commandHelp.description);
    
    // Add usage if available
    if (commandHelp.usage) {
      embed.addFields({
        name: '💻 Usage',
        value: commandHelp.usage
      });
    }

    // Add subcommands if available
    if (commandHelp.subcommands && commandHelp.subcommands.length > 0) {
      const subcommandsText = commandHelp.subcommands.map(sub => 
        `• **${sub.name}** - ${sub.description}\n  ↳ Usage: \`/${commandName} ${sub.usage}\``
      ).join('\n\n');
      
      embed.addFields({
        name: '🔧 Subcommands',
        value: subcommandsText
      });
    }

    // Add examples if available
    if (commandHelp.examples && commandHelp.examples.length > 0) {
      const examplesText = commandHelp.examples.map(ex => `\`/${ex}\``).join('\n');
      embed.addFields({
        name: '📚 Examples',
        value: examplesText
      });
    }

    // Add permissions if applicable
    if (commandHelp.permissions) {
      embed.addFields({
        name: '🔒 Permissions',
        value: commandHelp.permissions
      });
    }

    // Add notes if available
    if (commandHelp.notes) {
      embed.addFields({
        name: '💡 Notes',
        value: commandHelp.notes
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  getCommandHelp(commandName) {
    const helpData = {
      rank: {
        description: 'View your or another user\'s rank card with level, XP, and ranking information.',
        usage: 'rank [user]',
        examples: [
          'rank',
          'rank @User'
        ],
        notes: 'The rank card shows your current level, XP progress, server rank, and total XP with a beautiful visual design.'
      },

      leaderboard: {
        description: 'Check the server leaderboard to see the top users by XP.',
        usage: 'leaderboard [limit]',
        examples: [
          'leaderboard',
          'leaderboard 15'
        ],
        notes: 'Shows the top 10 users by default. You can specify up to 25 users.'
      },

      background: {
        description: 'Manage your rank card background with custom images.',
        usage: '`/background <subcommand>`',
        subcommands: [
          {
            name: 'set',
            description: 'Set a custom background for your rank card',
            usage: 'background set [image]'
          },
          {
            name: 'remove', 
            description: 'Remove your custom background',
            usage: 'background remove'
          },
          {
            name: 'view',
            description: 'View your current background',
            usage: 'background view'
          }
        ],
        examples: [
          'background set (then upload an image)',
          'background remove',
          'background view'
        ],
        notes: 'Supported formats: PNG, JPG, JPEG, GIF, WEBP. Max size: 8MB. Minimum dimensions: 400x400px.'
      },

      xp: {
        description: 'Manage user XP (Administrator only).',
        usage: '`/xp <subcommand>`',
        permissions: 'Requires **Administrator** permission',
        subcommands: [
          {
            name: 'add',
            description: 'Add XP to a user',
            usage: 'xp add [user] [amount]'
          },
          {
            name: 'remove',
            description: 'Remove XP from a user', 
            usage: 'xp remove [user] [amount]'
          },
          {
            name: 'reset',
            description: 'Reset a user\'s XP completely',
            usage: 'xp reset [user]'
          }
        ],
        examples: [
          'xp add @User 100',
          'xp remove @User 50',
          'xp reset @User'
        ],
        notes: 'Use these commands carefully as they directly affect user levels and rankings.'
      },

      level: {
        description: 'Manage user levels (Administrator only).',
        usage: '`/level <subcommand>`',
        permissions: 'Requires **Administrator** permission',
        subcommands: [
          {
            name: 'add',
            description: 'Add levels to a user',
            usage: 'level add [user] [amount]'
          },
          {
            name: 'remove',
            description: 'Remove levels from a user',
            usage: 'level remove [user] [amount]'
          }
        ],
        examples: [
          'level add @User 5',
          'level remove @User 3'
        ],
        notes: 'Adding/removing levels will automatically adjust the user\'s XP to match the new level.'
      },

      config: {
        description: 'Configure leveling system settings (Administrator only).',
        usage: '`/config <subcommand>`',
        permissions: 'Requires **Administrator** permission',
        subcommands: [
          {
            name: 'view',
            description: 'View current configuration',
            usage: 'config view'
          },
          {
            name: 'multiplier',
            description: 'Set XP multipliers for roles or channels',
            usage: 'config multiplier [type] [target] [value]'
          },
          {
            name: 'level-up-messages',
            description: 'Toggle level up messages',
            usage: 'config level-up-messages [enabled]'
          },
          {
            name: 'blacklist add',
            description: 'Add to XP blacklist',
            usage: 'config blacklist add [type] [target]'
          },
          {
            name: 'blacklist remove',
            description: 'Remove from XP blacklist',
            usage: 'config blacklist remove [type] [target]'
          },
          {
            name: 'blacklist view',
            description: 'View current blacklist',
            usage: 'config blacklist view'
          }
        ],
        examples: [
          'config multiplier role @Premium 2.0',
          'config multiplier channel #leveling 1.5',
          'config blacklist add role @Muted',
          'config blacklist add user @Spammer',
          'config level-up-messages true'
        ],
        notes: 'Blacklisted roles/users/channels cannot earn XP. Multipliers allow bonus XP in specific channels or for specific roles.'
      },

      ping: {
        description: 'Check the bot\'s latency and connection status.',
        usage: 'ping',
        examples: ['ping'],
        notes: 'Use this command to verify the bot is responding properly.'
      }
    };

    return helpData[commandName] || {
      description: 'Command not found.',
      usage: 'N/A',
      notes: 'Please check the command name and try again.'
    };
  }
};