const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your rank card')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check rank for')
        .setRequired(false)
    ),
  async execute(interaction, client) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildMember = await interaction.guild.members.fetch(targetUser.id);
    const userData = await client.db.getUser(targetUser.id, interaction.guild.id);
    const rank = await client.db.getRank(targetUser.id, interaction.guild.id);

    const rankCard = await client.rankCard.generateRankCard(userData, rank, guildMember);
    
    await interaction.editReply({ files: [rankCard] });
  }
};