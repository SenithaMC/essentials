const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class RankCardGenerator {
  constructor() {
  }

  async generateRankCard(user, rank, guildMember) {
    try {
      const width = 900;
      const height = 280;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      if (user.background) {
        try {
          let background;
          if (user.background.startsWith('./data/backgrounds/')) {
            const backgroundPath = path.join(__dirname, '..', user.background);
            background = await loadImage(backgroundPath);
          } else {
            background = await loadImage(user.background);
          }
          ctx.drawImage(background, 0, 0, width, height);
        } catch (error) {
          console.error('Error loading user background, using cosmic background:', error);
          this.createCosmicBackground(ctx, canvas);
        }
      } else {
        this.createCosmicBackground(ctx, canvas);
      }

      this.drawMainContainer(ctx, canvas);
      await this.drawUserSection(ctx, guildMember);
      this.drawStatsSection(ctx, user, rank, guildMember);
      this.drawProgressSection(ctx, user);
      this.drawDecorationElements(ctx, canvas);

      return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'rank.png' });
    } catch (error) {
      console.error('Error generating rank card:', error);
      throw error;
    }
  }

  createCosmicBackground(ctx, canvas) {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(0.3, '#1a1a4a');
    gradient.addColorStop(0.6, '#2d1b69');
    gradient.addColorStop(1, '#4a1c7a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.addStars(ctx, canvas);
    this.addNebulaEffect(ctx, canvas);
    this.addGeometricPatterns(ctx, canvas);
  }

  addStars(ctx, canvas) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 1.2;
      const opacity = Math.random() * 0.9 + 0.1;
      
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  addNebulaEffect(ctx, canvas) {
    ctx.save();
    
    const nebula1 = ctx.createRadialGradient(
      canvas.width * 0.7, canvas.height * 0.3, 0,
      canvas.width * 0.7, canvas.height * 0.3, canvas.width * 0.5
    );
    nebula1.addColorStop(0, 'rgba(106, 13, 173, 0.4)');
    nebula1.addColorStop(1, 'rgba(106, 13, 173, 0)');
    
    ctx.fillStyle = nebula1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const nebula2 = ctx.createRadialGradient(
      canvas.width * 0.3, canvas.height * 0.7, 0,
      canvas.width * 0.3, canvas.height * 0.7, canvas.width * 0.4
    );
    nebula2.addColorStop(0, 'rgba(0, 195, 255, 0.3)');
    nebula2.addColorStop(1, 'rgba(0, 195, 255, 0)');
    
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
  }

  addGeometricPatterns(ctx, canvas) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 8; i++) {
      const size = 40 + i * 20;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawMainContainer(ctx, canvas) {
    const width = canvas.width - 40;
    const height = canvas.height - 40;
    const x = 20;
    const y = 20;
    const radius = 25;

    this.drawGlassPanel(ctx, x, y, width, height, radius);
    this.drawContainerGlow(ctx, x, y, width, height);
  }

  drawContainerGlow(ctx, x, y, width, height) {
    ctx.save();
    
    const glow = ctx.createRadialGradient(
      x + width/2, y + height/2, 0,
      x + width/2, y + height/2, Math.max(width, height)/1.5
    );
    glow.addColorStop(0, 'rgba(0, 255, 163, 0.1)');
    glow.addColorStop(0.5, 'rgba(0, 195, 255, 0.05)');
    glow.addColorStop(1, 'rgba(106, 13, 173, 0)');
    
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 30, width + 60, height + 60);
    
    ctx.restore();
  }

  async drawUserSection(ctx, guildMember) {
    try {
      const avatarUrl = guildMember.user.displayAvatarURL({ extension: 'jpg', size: 128 });
      const avatar = await loadImage(avatarUrl);
      
      this.drawAvatarGlow(ctx, 40, 40, 160, 160, 20);
      this.drawRoundedImageWithBorder(ctx, avatar, 40, 40, 160, 160, 20, '#FFFFFF', 3);
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  }

  drawAvatarGlow(ctx, x, y, width, height, radius) {
    ctx.save();
    
    const glow = ctx.createRadialGradient(
      x + width/2, y + height/2, radius,
      x + width/2, y + height/2, Math.max(width, height)/1.2
    );
    glow.addColorStop(0, 'rgba(0, 255, 163, 0.3)');
    glow.addColorStop(0.7, 'rgba(0, 195, 255, 0.1)');
    glow.addColorStop(1, 'rgba(0, 195, 255, 0)');
    
    ctx.fillStyle = glow;
    ctx.fillRect(x - 25, y - 25, width + 50, height + 50);
    
    ctx.restore();
  }

  drawStatsSection(ctx, user, rank, guildMember) {
    this.drawUsername(ctx, guildMember);
    this.drawMainStats(ctx, user, rank);
    this.drawAdditionalStats(ctx, user);
  }

  drawUsername(ctx, guildMember) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    this.drawTextWithGlow(ctx, guildMember.displayName, 230, 65, '#FFFFFF', '#00FFA3');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.fillText(`@${guildMember.user.username}`, 230, 95);
  }

  drawMainStats(ctx, user, rank) {
    this.drawStatBadge(ctx, 230, 110, 140, 40, '#00FFA3', `Rank: #${rank}`);
    this.drawStatBadge(ctx, 380, 110, 140, 40, '#00C3FF', `Level: ${user.level}`);
    this.drawStatBadge(ctx, 530, 110, 200, 40, '#9D50BB', `Total: ${user.xp.toLocaleString()} XP`);
  }

  drawStatBadge(ctx, x, y, width, height, color, text) {
    ctx.save();
    
    ctx.fillStyle = color + '40';
    this.drawRoundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, width, height, 10);
    ctx.stroke();
    
    ctx.strokeStyle = color + '30';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, 9);
    ctx.stroke();
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width/2, y + height/2);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.restore();
  }

  drawAdditionalStats(ctx, user) {
    const messagesPerLevel = Math.floor(user.xp / 100);
    const daysActive = Math.floor(user.xp / 50);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Messages: ${messagesPerLevel}`, 230, 165);
  }

  drawProgressSection(ctx, user) {
    const currentLevelXP = this.calculateXPForLevel(user.level);
    const nextLevelXP = this.calculateXPForLevel(user.level + 1);
    const xpProgress = user.xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const progress = Math.min(1, xpProgress / xpNeeded);
    const percentage = (progress * 100).toFixed(1);

    this.drawXPBar(ctx, 230, 180, 500, 30, 15, progress, percentage, xpProgress, xpNeeded);
    this.drawLevelMarkers(ctx, 230, 220, 500, user.level);
  }

  drawXPBar(ctx, x, y, width, height, radius, progress, percentage, xpProgress, xpNeeded) {
    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    if (progress > 0) {
      const fillWidth = Math.max(radius * 2, (width - 4) * progress);
      
      const gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, '#00FFA3');
      gradient.addColorStop(0.3, '#00D9FF');
      gradient.addColorStop(0.7, '#00C3FF');
      gradient.addColorStop(1, '#667eea');
      
      this.drawRoundedRect(ctx, x + 2, y + 2, fillWidth, height - 4, radius - 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const glow = ctx.createLinearGradient(x, y, x + fillWidth, y);
      glow.addColorStop(0, 'rgba(0, 255, 163, 0.6)');
      glow.addColorStop(1, 'rgba(0, 195, 255, 0.6)');
      
      this.drawRoundedRect(ctx, x + 2, y + 2, fillWidth, height - 4, radius - 2);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const textColor = progress > 0.5 ? '#000000' : '#FFFFFF';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const progressText = `${xpProgress.toLocaleString()}/${xpNeeded.toLocaleString()} XP • ${percentage}%`;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText(progressText, x + width / 2, y + height / 2);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.restore();
  }

  drawLevelMarkers(ctx, x, y, width, currentLevel) {
    ctx.save();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lvl ${currentLevel}`, x - 5, y);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Lvl ${currentLevel + 1}`, x + width + 5, y);
    
    ctx.restore();
  }

  drawDecorationElements(ctx, canvas) {
    this.drawCornerAccents(ctx, canvas);
    this.drawProgressParticles(ctx, canvas);
  }

  drawCornerAccents(ctx, canvas) {
    ctx.save();
    
    ctx.strokeStyle = 'rgba(0, 255, 163, 0.4)';
    ctx.lineWidth = 2;
    
    const size = 15;
    const margin = 25;
    
    ctx.beginPath();
    ctx.moveTo(margin, margin + size);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + size, margin);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(canvas.width - margin - size, margin);
    ctx.lineTo(canvas.width - margin, margin);
    ctx.lineTo(canvas.width - margin, margin + size);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(canvas.width - margin, canvas.height - margin - size);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin - size, canvas.height - margin);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(margin + size, canvas.height - margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(margin, canvas.height - margin - size);
    ctx.stroke();
    
    ctx.restore();
  }

  drawProgressParticles(ctx, canvas) {
    ctx.save();
    
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const x = 230 + Math.random() * 500;
      const y = 180 + Math.random() * 30;
      const radius = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.7 + 0.3;
      
      ctx.fillStyle = `rgba(0, 255, 163, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  drawGlassPanel(ctx, x, y, width, height, radius) {
    ctx.save();
    
    const glow = ctx.createRadialGradient(
      x + width/2, y + height/2, 0,
      x + width/2, y + height/2, Math.max(width, height)/2
    );
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = glow;
    ctx.fillRect(x - 10, y - 10, width + 20, height + 20);

    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    this.drawRoundedRect(ctx, x + 2, y + 2, width - 4, height - 4, radius - 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  drawRoundedImageWithBorder(ctx, image, x, y, width, height, radius, borderColor, borderWidth) {
    ctx.save();
    
    this.drawRoundedRect(ctx, x - borderWidth, y - borderWidth, width + borderWidth * 2, height + borderWidth * 2, radius + borderWidth);
    ctx.fillStyle = borderColor;
    ctx.fill();

    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();

    ctx.drawImage(image, x, y, width, height);

    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  drawTextWithGlow(ctx, text, x, y, textColor, glowColor) {
    ctx.save();
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
    
    ctx.restore();
  }

  calculateXPForLevel(level) {
    return Math.floor(100 * Math.pow(level - 1, 2));
  }
}

module.exports = RankCardGenerator;
