const { command, commands } = require('../lib/');
const os = require('os');

command({
  pattern: 'menu',
  desc: 'List commands',
  dontAddCommandList: true,
  type: 'info'
}, async (message) => {
  const categories = {};

  commands.forEach(cmd => {
    if (!cmd.dontAddCommandList) {
      if (!categories[cmd.type]) {
        categories[cmd.type] = [];
      }
      let commandName;
      if (cmd.pattern instanceof RegExp) {
        commandName = cmd.pattern.toString().split(/\W+/)[1];
      } else if (typeof cmd.pattern === 'string') {
        commandName = cmd.pattern.split('|')[0].trim();
      } else {
        commandName = 'unknown';
      }
      categories[cmd.type].push(commandName);
    }
  });

  const formatTime = (seconds) => {
    const pad = (s) => (s < 10 ? '0' + s : s);
    const hours = pad(Math.floor(seconds / 3600));
    const minutes = pad(Math.floor((seconds % 3600) / 60));
    const secs = pad(seconds % 60);
    return `${hours}:${minutes}:${secs}`;
  };

  const uptime = Math.floor(process.uptime());
  const totalCommands = commands.filter(cmd => !cmd.dontAddCommandList).length;

  const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const usedMem = ((os.totalmem() - os.freemem()) / (1024 * 1024 * 1024)).toFixed(2);

  let menu = `╭─────────────┈⊷
│ 「 *${global.config.BOT_NAME}* 」
╰┬────────────┈⊷
┌┤
││◦➛ Owner: ${global.config.OWNER_NAME}
││◦➛ User: ${message.pushName || 'User'}
││◦➛ Commands: ${totalCommands}
││◦➛ Uptime: ${formatTime(uptime)}
││◦➛ Memory: ${usedMem}/${totalMem}GB
│╰────────────┈⊷
╰─────────────┈⊷

`;

  for (const [type, cmds] of Object.entries(categories)) {
    if (cmds.length > 0) {
      menu += `╭─────────────┈⊷
│ 「 *${type.toUpperCase()}* 」
╰┬────────────┈⊷
┌┤
`;
      cmds.forEach(cmd => {
        menu += `││◦➛ ${global.config.HANDLERS}${cmd}\n`;
      });
      menu += `│╰────────────┈⊷
╰─────────────┈⊷

`;
    }
  }

  menu += `Use ${global.config.HANDLERS}info <command> for details`;

  await message.reply(menu.trim());
});

command({
  pattern: 'info',
  desc: 'Get command information',
  dontAddCommandList: true,
  type: 'info'
}, async (message, match) => {
  if (!match) {
    // List all commands with their info
    const categories = {};

    commands.forEach(cmd => {
      if (!cmd.dontAddCommandList) {
        if (!categories[cmd.type]) {
          categories[cmd.type] = [];
        }
        let commandName;
        if (cmd.pattern instanceof RegExp) {
          commandName = cmd.pattern.toString().split(/\W+/)[1];
        } else if (typeof cmd.pattern === 'string') {
          commandName = cmd.pattern.split('|')[0].trim();
        } else {
          commandName = 'unknown';
        }
        categories[cmd.type].push({
          name: commandName,
          desc: cmd.desc || 'No description'
        });
      }
    });

    let response = `╭─────────────┈⊷
│ 「 *COMMANDS INFO* 」
╰┬────────────┈⊷
┌┤

`;

    for (const [type, cmds] of Object.entries(categories)) {
      response += `╭─────────────┈⊷
│ 「 *${type.toUpperCase()}* 」
╰┬────────────┈⊷
┌┤
`;
      cmds.forEach(cmd => {
        response += `││◦➛ ${global.config.HANDLERS}${cmd.name}
││   ${cmd.desc}
││
`;
      });
      response += `│╰────────────┈⊷
╰─────────────┈⊷

`;
    }

    return await message.reply(response.trim());
  }

  const commandName = match.trim().toLowerCase();
  const cmd = commands.find(c => {
    if (c.pattern instanceof RegExp) {
      const name = c.pattern.toString().split(/\W+/)[1];
      return name && name.toLowerCase() === commandName;
    } else if (typeof c.pattern === 'string') {
      const name = c.pattern.split('|')[0].trim();
      return name.toLowerCase() === commandName;
    }
    return false;
  });

  if (!cmd) {
    return await message.reply(`_Command "${commandName}" not found_\n\nUse ${global.config.HANDLERS}menu to see all commands`);
  }

  let cmdName;
  if (cmd.pattern instanceof RegExp) {
    cmdName = cmd.pattern.toString().split(/\W+/)[1];
  } else if (typeof cmd.pattern === 'string') {
    cmdName = cmd.pattern.split('|')[0].trim();
  }

  let response = `╭─────────────┈⊷
│ 「 *COMMAND INFO* 」
╰┬────────────┈⊷
┌┤
││◦➛ Name: ${cmdName}
││◦➛ Type: ${cmd.type}
││◦➛ Description: ${cmd.desc || 'No description'}
│╰────────────┈⊷
╰─────────────┈⊷`;

  await message.reply(response);
});
