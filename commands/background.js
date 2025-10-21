const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('background')
    .setDescription('Manage your rank card background')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your rank card background using an uploaded image')
        .addAttachmentOption(option =>
          option.setName('image')
            .setDescription('The image to use as background')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your rank card background')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current background')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    const backgroundsDir = path.join(__dirname, '..', 'data', 'backgrounds');
    if (!fs.existsSync(backgroundsDir)) {
      fs.mkdirSync(backgroundsDir, { recursive: true });
    }

    if (subcommand === 'set') {
      await interaction.deferReply({ ephemeral: true });
      
      const attachment = interaction.options.getAttachment('image');
      
      if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
        return await interaction.editReply({
          content: '❌ Please upload a valid image file! (PNG, JPG, JPEG, GIF, WEBP)',
        });
      }

      if (attachment.size > 8 * 1024 * 1024) {
        return await interaction.editReply({
          content: '❌ Image file is too large! Maximum size is 8MB.',
        });
      }

      try {
        const backgroundPath = await this.downloadAndProcessBackground(
          attachment.url, 
          interaction.user.id, 
          interaction.guild.id
        );
        
        await client.db.setBackground(interaction.user.id, interaction.guild.id, backgroundPath);
        
        await interaction.editReply({
          content: '✅ Background set successfully! Use `/rank` to see your new rank card.',
        });
      } catch (error) {
        await interaction.editReply({
          content: '❌ Failed to set background. Please try again with a different image.',
        });
      }
    }

    if (subcommand === 'remove') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const userData = await client.db.getUser(interaction.user.id, interaction.guild.id);
        
        if (userData.background) {
          let filePath;
          if (userData.background.startsWith('./data/backgrounds/')) {
            filePath = path.join(__dirname, '..', userData.background);
          } else {
            filePath = path.join(__dirname, '..', 'data', 'backgrounds', userData.background);
          }
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        await client.db.removeBackground(interaction.user.id, interaction.guild.id);
        
        await interaction.editReply({
          content: '✅ Background removed successfully!',
        });
      } catch (error) {
        await interaction.editReply({
          content: '❌ Failed to remove background. Please try again later.',
        });
      }
    }

    if (subcommand === 'view') {
      await interaction.deferReply({ ephemeral: true });
      
      const userData = await client.db.getUser(interaction.user.id, interaction.guild.id);
      
      if (!userData.background) {
        return await interaction.editReply({
          content: '❌ You don\'t have a background set! Use `/background set` to add one.',
        });
      }

      try {
        let imageBuffer;
        let filePath;
        
        if (userData.background.startsWith('./data/backgrounds/')) {
          filePath = path.join(__dirname, '..', userData.background);
        } else {
          filePath = path.join(__dirname, '..', 'data', 'backgrounds', userData.background);
        }

        if (fs.existsSync(filePath)) {
          imageBuffer = fs.readFileSync(filePath);
        } else {
          const response = await fetch(userData.background);
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'background.png' });

        const embed = new EmbedBuilder()
          .setTitle('Your Current Background')
          .setDescription('This is the image currently set as your rank card background.')
          .setImage('attachment://background.png')
          .setColor(0x00FF88)
          .setFooter({ text: 'Use /rank to see how it looks on your rank card!' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch (error) {
        await interaction.editReply({
          content: '❌ Failed to load your background. It may have been corrupted or deleted.',
        });
      }
    }
  },

  async downloadAndProcessBackground(imageUrl, userId, guildId) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const processedBuffer = await this.processImage(buffer);

        const filename = `background_${userId}_${guildId}.png`;
        const filePath = path.join(__dirname, '..', 'data', 'backgrounds', filename);
        
        fs.writeFileSync(filePath, processedBuffer);

        resolve(`./data/backgrounds/${filename}`);
      } catch (error) {
        reject(error);
      }
    });
  },

  async processImage(buffer) {
    return new Promise(async (resolve, reject) => {
      try {
        const image = await loadImage(buffer);
        
        const canvas = createCanvas(800, 240);
        const ctx = canvas.getContext('2d');

        const imgAspect = image.width / image.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
          drawHeight = canvas.height;
          drawWidth = image.width * (canvas.height / image.height);
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = image.height * (canvas.width / image.width);
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

        const processedBuffer = canvas.toBuffer('image/png');
        resolve(processedBuffer);
      } catch (error) {
        reject(error);
      }
    });
  }
};