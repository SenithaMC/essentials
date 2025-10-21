const { Client, GatewayIntentBits, Collection } = require('discord.js');
const RankCardGenerator = require('./utils/rankCard');
const Database = require('./utils/db');
const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const LINK = 'https://github.com/SenithaMC/essentials';
const BRANCH = 'main';

const cleanupFiles = () => {
  return new Promise((resolve, reject) => {
    const filesToKeep = ['index.js', 'config.json', 'node_modules', 'package.json', 'package-lock.json', 'utils', 'data'];
    
    fs.readdir(__dirname, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      files.forEach(file => {
        if (filesToKeep.includes(file)) {
          return;
        }

        const filePath = path.join(__dirname, file);
        
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
        }
      });

      resolve();
    });
  });
};

const downloadFromGitHub = () => {
  return new Promise((resolve, reject) => {
    const match = LINK.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      reject(new Error('Invalid GitHub repository URL'));
      return;
    }

    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');
    
    const downloadUrls = [
      `https://github.com/${owner}/${repoName}/archive/refs/heads/${BRANCH}.zip`,
      `https://codeload.github.com/${owner}/${repoName}/zip/refs/heads/${BRANCH}`,
      `https://github.com/${owner}/${repoName}/archive/${BRANCH}.zip`
    ];

    const attemptDownload = (urlIndex) => {
      if (urlIndex >= downloadUrls.length) {
        reject(new Error('All download URLs failed'));
        return;
      }

      const downloadUrl = downloadUrls[urlIndex];
      const tempZipPath = path.join(__dirname, 'temp_repo.zip');
      const tempExtractPath = path.join(__dirname, 'temp_extract');

      const file = fs.createWriteStream(tempZipPath);
      
      const request = https.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirectResponse) => {
            handleResponse(redirectResponse, urlIndex);
          }).on('error', () => {
            attemptDownload(urlIndex + 1);
          });
          return;
        }
        
        handleResponse(response, urlIndex);
      });

      const handleResponse = (response, currentUrlIndex) => {
        if (response.statusCode !== 200) {
          file.close();
          attemptDownload(currentUrlIndex + 1);
          return;
        }

        let receivedBytes = 0;
        response.on('data', (chunk) => {
          receivedBytes += chunk.length;
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          
          if (receivedBytes === 0) {
            attemptDownload(currentUrlIndex + 1);
            return;
          }
          
          const fileSize = fs.statSync(tempZipPath).size;
          
          if (fileSize < 1000) {
            attemptDownload(currentUrlIndex + 1);
            return;
          }

          const AdmZip = require('adm-zip');
          
          try {
            const zip = new AdmZip(tempZipPath);
            const entries = zip.getEntries();
            
            if (entries.length === 0) {
              attemptDownload(currentUrlIndex + 1);
              return;
            }

            zip.extractAllTo(tempExtractPath, true);
            
            const extractedFolders = fs.readdirSync(tempExtractPath);
            
            if (extractedFolders.length === 0) {
              attemptDownload(currentUrlIndex + 1);
              return;
            }

            const mainFolder = path.join(tempExtractPath, extractedFolders[0]);
            
            if (fs.existsSync(mainFolder)) {
              const items = fs.readdirSync(mainFolder);
              
              items.forEach(item => {
                if (item === 'node_modules') return;
                
                const srcPath = path.join(mainFolder, item);
                const destPath = path.join(__dirname, item);
                
                if (fs.existsSync(destPath)) {
                  const stats = fs.statSync(destPath);
                  if (stats.isDirectory()) {
                    fs.rmSync(destPath, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(destPath);
                  }
                }
                
                const copyRecursive = (src, dest) => {
                  const stat = fs.statSync(src);
                  if (stat.isDirectory()) {
                    if (!fs.existsSync(dest)) {
                      fs.mkdirSync(dest, { recursive: true });
                    }
                    fs.readdirSync(src).forEach(childItem => {
                      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
                    });
                  } else {
                    fs.copyFileSync(src, dest);
                  }
                };
                
                copyRecursive(srcPath, destPath);
              });
              
              try {
                fs.unlinkSync(tempZipPath);
                fs.rmSync(tempExtractPath, { recursive: true, force: true });
              } catch (e) {
              }
              
              resolve();
            } else {
              attemptDownload(currentUrlIndex + 1);
            }
          } catch (err) {
            attemptDownload(currentUrlIndex + 1);
          }
        });
      };

      request.on('error', () => {
        attemptDownload(urlIndex + 1);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        attemptDownload(urlIndex + 1);
      });
    };

    attemptDownload(0);
  });
};

const installDependencies = () => {
  return new Promise((resolve) => {
    if (fs.existsSync(path.join(__dirname, 'package.json'))) {
      exec('npm install --quiet', { cwd: __dirname }, () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
};

const initializeWithUpdate = async () => {
  try {
    await cleanupFiles();
    
    try {
      await downloadFromGitHub();
    } catch (error) {
    }
    
    await installDependencies();
    
    await initializeBot();
    
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

client.db = new Database();
client.rankCard = new RankCardGenerator();
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userRoles = message.member.roles.cache.map(role => role.id);
  const isBlacklisted = await client.db.isBlacklisted(
    message.guild.id, 
    message.author.id, 
    message.channel.id, 
    userRoles
  );

  if (isBlacklisted) return;

  let xpToAdd = Math.floor(Math.random() * 10) + 5;

  const channelMultiplier = await client.db.getMultiplierForTarget(
    message.guild.id, 
    'channel', 
    message.channel.id
  );
  xpToAdd *= channelMultiplier;

  let highestRoleMultiplier = 1.0;
  for (const roleId of userRoles) {
    const roleMultiplier = await client.db.getMultiplierForTarget(
      message.guild.id, 
      'role', 
      roleId
    );
    if (roleMultiplier > highestRoleMultiplier) {
      highestRoleMultiplier = roleMultiplier;
    }
  }
  xpToAdd *= highestRoleMultiplier;

  xpToAdd = Math.round(xpToAdd);

  const result = await client.db.addXP(message.author.id, message.guild.id, xpToAdd);

  if (result.leveledUp) {
    const settings = await client.db.getGuildSettings(message.guild.id);
    
    if (settings.level_up_messages) {
      const levelUpMessages = [
        `🎉 Congratulations ${message.author}! You leveled up to **level ${result.newLevel}**!`,
        `🌟 Amazing work ${message.author}! You've reached **level ${result.newLevel}**!`,
        `🚀 ${message.author} is on fire! Leveled up to **level ${result.newLevel}**!`,
        `🏆 Level up! ${message.author} is now **level ${result.newLevel}**!`,
        `✨ ${message.author} has ascended to **level ${result.newLevel}**!`,
        `🔥 ${message.author} leveled up to **level ${result.newLevel}**! Keep it up!`,
        `💫 Bravo ${message.author}! Welcome to **level ${result.newLevel}**!`,
        `🎊 ${message.author} just hit **level ${result.newLevel}**! Amazing progress!`
      ];

      const randomMessage = levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
      
      try {
        await message.channel.send(randomMessage);
      } catch (error) {
        console.error('Error sending level-up message:', error);
      }
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error executing this command!',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'There was an error executing this command!',
        ephemeral: true
      });
    }
  }
});

const { REST, Routes } = require('discord.js');

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  try {
    console.log('🔄 Registering slash commands...');
    
    const commands = [];
    for (const [name, command] of client.commands) {
      commands.push(command.data.toJSON());
    }
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
});

const initializeBot = async () => {
  try {
    if (!config.token) throw new Error('No token provided in config.json');
    await client.login(config.token);
  } catch (error) {
    console.error('❌ Error initializing bot:', error);
    process.exit(1);
  }
};

initializeWithUpdate();
