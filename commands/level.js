const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Manage user levels (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add levels to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add levels to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of levels to add')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove levels from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove levels from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of levels to remove')
            .setRequired(true)
            .setMinValue(1)
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (subcommand === 'add') {
      const result = await client.db.addLevelAdmin(targetUser.id, interaction.guild.id, amount);
      await interaction.reply({
        content: `✅ Added ${amount} levels to ${targetUser.tag}. They are now level ${result.newLevel} with ${result.newXP} XP.`,
        ephemeral: true
      });
    }

    if (subcommand === 'remove') {
      const result = await client.db.removeLevelAdmin(targetUser.id, interaction.guild.id, amount);
      await interaction.reply({
        content: `✅ Removed ${amount} levels from ${targetUser.tag}. They are now level ${result.newLevel} with ${result.newXP} XP.`,
        ephemeral: true
      });
    }
  }
};