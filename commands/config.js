const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure leveling settings (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('multiplier')
        .setDescription('Set XP multiplier for roles or channels')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of multiplier target')
            .setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' }
            )
        )
        .addStringOption(option =>
          option.setName('target')
            .setDescription('The role or channel to set multiplier for')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('value')
            .setDescription('XP multiplier value (0.5 = half, 2.0 = double)')
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(10.0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('level-up-messages')
        .setDescription('Toggle level up messages')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Whether to show level up messages')
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('blacklist')
        .setDescription('Manage XP blacklist')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add to XP blacklist')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Type to blacklist')
                .setRequired(true)
                .addChoices(
                  { name: 'Role', value: 'role' },
                  { name: 'User', value: 'user' },
                  { name: 'Channel', value: 'channel' }
                )
            )
            .addStringOption(option =>
              option.setName('target')
                .setDescription('The role, user, or channel to blacklist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove from XP blacklist')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Type to remove from blacklist')
                .setRequired(true)
                .addChoices(
                  { name: 'Role', value: 'role' },
                  { name: 'User', value: 'user' },
                  { name: 'Channel', value: 'channel' }
                )
            )
            .addStringOption(option =>
              option.setName('target')
                .setDescription('The role, user, or channel to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View current blacklist')
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();

    if (subcommand === 'view' && !subcommandGroup) {
      await this.handleView(interaction, client);
    } else if (subcommand === 'multiplier') {
      await this.handleMultiplier(interaction, client);
    } else if (subcommand === 'level-up-messages') {
      await this.handleLevelUpMessages(interaction, client);
    } else if (subcommandGroup === 'blacklist') {
      await this.handleBlacklist(interaction, client, subcommand);
    }
  },

  async handleView(interaction, client) {
    const [settings, multipliers, blacklist] = await Promise.all([
      client.db.getGuildSettings(interaction.guild.id),
      client.db.getMultipliers(interaction.guild.id),
      client.db.getBlacklist(interaction.guild.id)
    ]);

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Leveling Configuration')
      .setColor(0x00FF88)
      .addFields(
        { name: 'Level Up Messages', value: settings.level_up_messages ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Multipliers', value: multipliers.length > 0 ? `${multipliers.length} active` : 'None set', inline: true },
        { name: 'Blacklisted Items', value: blacklist.length > 0 ? `${blacklist.length} items` : 'None', inline: true }
      )
      .setTimestamp();

    if (multipliers.length > 0) {
      const multiplierText = multipliers.map(m => {
        const target = m.target_type === 'role' ? 
          `<@&${m.target_id}>` : `<#${m.target_id}>`;
        return `${target}: ×${m.multiplier}`;
      }).join('\n');
      
      embed.addFields({ name: 'Active Multipliers', value: multiplierText });
    }

    if (blacklist.length > 0) {
      const blacklistText = blacklist.map(b => {
        const mention = b.type === 'role' ? `<@&${b.target_id}>` :
                        b.type === 'user' ? `<@${b.target_id}>` :
                        `<#${b.target_id}>`;
        return `${b.type}: ${mention}`;
      }).join('\n');
      
      embed.addFields({ name: 'Blacklisted', value: blacklistText });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleMultiplier(interaction, client) {
    const targetType = interaction.options.getString('type');
    const targetInput = interaction.options.getString('target');
    const multiplier = interaction.options.getNumber('value');

    const targetId = this.parseMention(targetInput);

    if (!targetId) {
      return await interaction.reply({
        content: '❌ Please provide a valid role or channel mention!',
        ephemeral: true
      });
    }

    try {
      if (targetType === 'role') {
        const role = await interaction.guild.roles.fetch(targetId);
        if (!role) throw new Error('Role not found');
      } else if (targetType === 'channel') {
        const channel = await interaction.guild.channels.fetch(targetId);
        if (!channel) throw new Error('Channel not found');
      }
    } catch (error) {
      return await interaction.reply({
        content: `❌ ${targetType} not found! Please check your input.`,
        ephemeral: true
      });
    }

    await client.db.setMultiplier(interaction.guild.id, targetType, targetId, multiplier);

    const targetMention = targetType === 'role' ? `<@&${targetId}>` : `<#${targetId}>`;
    
    await interaction.reply({
      content: `✅ XP multiplier for ${targetMention} set to ×${multiplier}`,
      ephemeral: true
    });
  },

  async handleLevelUpMessages(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const settings = await client.db.getGuildSettings(interaction.guild.id);

    await client.db.updateGuildSettings(interaction.guild.id, {
      ...settings,
      level_up_messages: enabled
    });

    await interaction.reply({
      content: `✅ Level up messages ${enabled ? 'enabled' : 'disabled'}`,
      ephemeral: true
    });
  },

  async handleBlacklist(interaction, client, subcommand) {
    if (subcommand === 'add') {
      await this.handleBlacklistAdd(interaction, client);
    } else if (subcommand === 'remove') {
      await this.handleBlacklistRemove(interaction, client);
    } else if (subcommand === 'view') {
      await this.handleBlacklistView(interaction, client);
    }
  },

  async handleBlacklistAdd(interaction, client) {
    const type = interaction.options.getString('type');
    const targetInput = interaction.options.getString('target');
    const targetId = this.parseMention(targetInput);

    if (!targetId) {
      return await interaction.reply({
        content: '❌ Please provide a valid mention!',
        ephemeral: true
      });
    }

    try {
      if (type === 'role') {
        const role = await interaction.guild.roles.fetch(targetId);
        if (!role) throw new Error('Role not found');
      } else if (type === 'user') {
        const user = await interaction.guild.members.fetch(targetId);
        if (!user) throw new Error('User not found');
      } else if (type === 'channel') {
        const channel = await interaction.guild.channels.fetch(targetId);
        if (!channel) throw new Error('Channel not found');
      }
    } catch (error) {
      return await interaction.reply({
        content: `❌ ${type} not found! Please check your input.`,
        ephemeral: true
      });
    }

    await client.db.addToBlacklist(interaction.guild.id, type, targetId);

    const mention = type === 'role' ? `<@&${targetId}>` :
                   type === 'user' ? `<@${targetId}>` :
                   `<#${targetId}>`;

    await interaction.reply({
      content: `✅ Added ${type} ${mention} to XP blacklist`,
      ephemeral: true
    });
  },

  async handleBlacklistRemove(interaction, client) {
    const type = interaction.options.getString('type');
    const targetInput = interaction.options.getString('target');
    const targetId = this.parseMention(targetInput);

    if (!targetId) {
      return await interaction.reply({
        content: '❌ Please provide a valid mention!',
        ephemeral: true
      });
    }

    await client.db.removeFromBlacklist(interaction.guild.id, type, targetId);

    const mention = type === 'role' ? `<@&${targetId}>` :
                   type === 'user' ? `<@${targetId}>` :
                   `<#${targetId}>`;

    await interaction.reply({
      content: `✅ Removed ${type} ${mention} from XP blacklist`,
      ephemeral: true
    });
  },

  async handleBlacklistView(interaction, client) {
    const blacklist = await client.db.getBlacklist(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle('🚫 XP Blacklist')
      .setColor(0xFF6B6B)
      .setTimestamp();

    if (blacklist.length === 0) {
      embed.setDescription('No items in blacklist.');
    } else {
      const blacklistText = blacklist.map(b => {
        const mention = b.type === 'role' ? `<@&${b.target_id}>` :
                        b.type === 'user' ? `<@${b.target_id}>` :
                        `<#${b.target_id}>`;
        return `• ${b.type.charAt(0).toUpperCase() + b.type.slice(1)}: ${mention}`;
      }).join('\n');
      
      embed.setDescription(blacklistText);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  parseMention(mention) {
    const roleMatch = mention.match(/^<@&(\d+)>$/);
    if (roleMatch) return roleMatch[1];

    const userMatch = mention.match(/^<@!?(\d+)>$/);
    if (userMatch) return userMatch[1];

    const channelMatch = mention.match(/^<#(\d+)>$/);
    if (channelMatch) return channelMatch[1];

    return null;
  }
};