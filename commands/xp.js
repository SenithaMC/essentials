const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Manage user XP (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add XP to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add XP to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of XP to add')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove XP from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove XP from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of XP to remove')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset a user\'s XP')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to reset')
            .setRequired(true)
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');

    if (subcommand === 'add') {
      const amount = interaction.options.getInteger('amount');
      const result = await client.db.addXPAdmin(targetUser.id, interaction.guild.id, amount);
      
      await interaction.reply({
        content: `✅ Added ${amount} XP to ${targetUser.tag}. They are now level ${result.newLevel} with ${result.newXP} XP.`,
        ephemeral: true
      });
    }

    if (subcommand === 'remove') {
      const amount = interaction.options.getInteger('amount');
      const result = await client.db.removeXPAdmin(targetUser.id, interaction.guild.id, amount);
      
      await interaction.reply({
        content: `✅ Removed ${amount} XP from ${targetUser.tag}. They are now level ${result.newLevel} with ${result.newXP} XP.`,
        ephemeral: true
      });
    }

    if (subcommand === 'reset') {
      await client.db.resetUser(targetUser.id, interaction.guild.id);
      await interaction.reply({
        content: `✅ Reset XP for ${targetUser.tag}.`,
        ephemeral: true
      });
    }
  }
};