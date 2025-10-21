const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(path.join(dataDir, 'leveling.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Users table for levels and XP
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT,
          guild_id TEXT,
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,  -- Changed from 0 to 1
          background TEXT DEFAULT NULL,
          PRIMARY KEY (user_id, guild_id)
        )
      `);

      // Guild settings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS guild_settings (
          guild_id TEXT PRIMARY KEY,
          xp_rate INTEGER DEFAULT 1,
          level_up_messages BOOLEAN DEFAULT TRUE
        )
      `);
    });
  }

  // User methods
  async getUser(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { user_id: userId, guild_id: guildId, xp: 0, level: 1, background: null }); // Start at level 1
        }
      );
    });
  }

  async addXP(userId, guildId, xpToAdd) {
    const user = await this.getUser(userId, guildId);
    const newXP = user.xp + xpToAdd;
    const newLevel = this.calculateLevel(newXP);

    await this.updateUser(userId, guildId, newXP, newLevel);

    if (newLevel > user.level) {
      return { leveledUp: true, newLevel, oldLevel: user.level, userId, guildId };
    }

    return { leveledUp: false };
  }

  calculateLevel(xp) {
    // Level formula: level = floor(0.1 * sqrt(xp)) + 1
    // This ensures level starts at 1 when xp = 0
    return Math.floor(0.1 * Math.sqrt(xp)) + 1;
  }

  calculateXPForLevel(level) {
    // Reverse of calculateLevel: xp = ((level - 1) / 0.1)^2
    return Math.floor(Math.pow((level - 1) / 0.1, 2));
  }

  async updateUser(userId, guildId, xp, level) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO users (user_id, guild_id, xp, level) 
         VALUES (?, ?, ?, ?)`,
        [userId, guildId, xp, level],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async setBackground(userId, guildId, backgroundUrl) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET background = ? WHERE user_id = ? AND guild_id = ?',
        [backgroundUrl, userId, guildId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async removeBackground(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET background = NULL WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getLeaderboard(guildId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?',
        [guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getRank(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) + 1 as rank 
         FROM users 
         WHERE guild_id = ? AND xp > (SELECT xp FROM users WHERE user_id = ? AND guild_id = ?)`,
        [guildId, userId, guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.rank : 1);
        }
      );
    });
  }

  // Admin methods
  async addXPAdmin(userId, guildId, xp) {
    const user = await this.getUser(userId, guildId);
    const newXP = user.xp + xp;
    const newLevel = this.calculateLevel(newXP);
    await this.updateUser(userId, guildId, newXP, newLevel);
    return { newXP, newLevel };
  }

  async removeXPAdmin(userId, guildId, xp) {
    const user = await this.getUser(userId, guildId);
    const newXP = Math.max(0, user.xp - xp);
    const newLevel = this.calculateLevel(newXP);
    await this.updateUser(userId, guildId, newXP, newLevel);
    return { newXP, newLevel };
  }

  async addLevelAdmin(userId, guildId, levels) {
    const user = await this.getUser(userId, guildId);
    const newLevel = user.level + levels;
    const newXP = this.calculateXPForLevel(newLevel);
    await this.updateUser(userId, guildId, newXP, newLevel);
    return { newXP, newLevel };
  }

  async removeLevelAdmin(userId, guildId, levels) {
    const user = await this.getUser(userId, guildId);
    const newLevel = Math.max(1, user.level - levels); // Minimum level is 1
    const newXP = this.calculateXPForLevel(newLevel);
    await this.updateUser(userId, guildId, newXP, newLevel);
    return { newXP, newLevel };
  }

  async resetUser(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM users WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Guild settings
  async getGuildSettings(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM guild_settings WHERE guild_id = ?',
        [guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { guild_id: guildId, xp_rate: 1, level_up_messages: true });
        }
      );
    });
  }

  async updateGuildSettings(guildId, settings) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO guild_settings (guild_id, xp_rate, level_up_messages) 
         VALUES (?, ?, ?)`,
        [guildId, settings.xp_rate, settings.level_up_messages],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

module.exports = Database;
