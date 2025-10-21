const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Check the server leaderboard')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setRequired(false)
    ),
  async execute(interaction, client) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 10;
    const leaderboard = await client.db.getLeaderboard(interaction.guild.id, limit);

    if (leaderboard.length === 0) {
      return await interaction.editReply('No users found in the leaderboard!');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Leaderboard - ${interaction.guild.name}`)
      .setColor(0x00FF88)
      .setTimestamp();

    let description = '';
    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      try {
        const member = await interaction.guild.members.fetch(user.user_id);
        description += `**${i + 1}.** ${member.displayName} - Level ${user.level} (${user.xp.toLocaleString()} XP)\n`;
      } catch (error) {
        description += `**${i + 1}.** <@${user.user_id}> - Level ${user.level} (${user.xp.toLocaleString()} XP)\n`;
      }
    }

    embed.setDescription(description);
    await interaction.editReply({ embeds: [embed] });
  }
};