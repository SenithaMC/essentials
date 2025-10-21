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
          level INTEGER DEFAULT 1,
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

      // Multipliers table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS multipliers (
          guild_id TEXT,
          target_type TEXT, -- 'role' or 'channel'
          target_id TEXT,
          multiplier REAL DEFAULT 1.0,
          PRIMARY KEY (guild_id, target_type, target_id)
        )
      `);

      // Blacklist table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS blacklist (
          guild_id TEXT,
          type TEXT, -- 'role', 'user', or 'channel'
          target_id TEXT,
          PRIMARY KEY (guild_id, type, target_id)
        )
      `);
    });
  }

  // Multiplier methods
  async setMultiplier(guildId, targetType, targetId, multiplier) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO multipliers (guild_id, target_type, target_id, multiplier) 
         VALUES (?, ?, ?, ?)`,
        [guildId, targetType, targetId, multiplier],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async removeMultiplier(guildId, targetType, targetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM multipliers WHERE guild_id = ? AND target_type = ? AND target_id = ?',
        [guildId, targetType, targetId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getMultipliers(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM multipliers WHERE guild_id = ?',
        [guildId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getMultiplierForTarget(guildId, targetType, targetId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT multiplier FROM multipliers WHERE guild_id = ? AND target_type = ? AND target_id = ?',
        [guildId, targetType, targetId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.multiplier : 1.0);
        }
      );
    });
  }

  // Blacklist methods
  async addToBlacklist(guildId, type, targetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO blacklist (guild_id, type, target_id) VALUES (?, ?, ?)',
        [guildId, type, targetId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async removeFromBlacklist(guildId, type, targetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM blacklist WHERE guild_id = ? AND type = ? AND target_id = ?',
        [guildId, type, targetId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getBlacklist(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM blacklist WHERE guild_id = ?',
        [guildId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async isBlacklisted(guildId, userId, channelId, userRoles = []) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM blacklist WHERE guild_id = ?',
        [guildId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          for (const item of rows) {
            if (item.type === 'user' && item.target_id === userId) {
              resolve(true);
              return;
            }
            if (item.type === 'channel' && item.target_id === channelId) {
              resolve(true);
              return;
            }
            if (item.type === 'role' && userRoles.includes(item.target_id)) {
              resolve(true);
              return;
            }
          }
          resolve(false);
        }
      );
    });
  }

  // User methods
  async getUser(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            // Ensure the background path is properly formatted
            if (row.background && !row.background.startsWith('./data/backgrounds/')) {
              row.background = `./data/backgrounds/${row.background}`;
            }
            resolve(row);
          } else {
            resolve({ user_id: userId, guild_id: guildId, xp: 0, level: 1, background: null });
          }
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
    return Math.floor(0.1 * Math.sqrt(xp)) + 1;
  }

  calculateXPForLevel(level) {
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

  async setBackground(userId, guildId, backgroundPath) {
    return new Promise((resolve, reject) => {
      // Ensure the path is stored correctly
      const storedPath = backgroundPath.startsWith('./data/backgrounds/') ? 
        backgroundPath : `./data/backgrounds/${backgroundPath}`;
      
      this.db.run(
        'UPDATE users SET background = ? WHERE user_id = ? AND guild_id = ?',
        [storedPath, userId, guildId],
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
    const newLevel = Math.max(1, user.level - levels);
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
