const fs = require('fs');

if (fs.existsSync('config.env')) {
    require('dotenv').config({
        path: './config.env'
    });
}

require('./resources/database/settings');

const envSudo = process.env.SUDO ? process.env.SUDO.split(',').map(s => s.trim()) : [''];
envSudo.forEach(number => {
    if (number && !global.SettingsDB.isSudo(number)) {
        global.SettingsDB.addSudo(number);
    }
});

global.config = {
    ANTILINK: process.env.ANTI_LINK === 'false' || false,
    ALWAYS_ONLINE: global.SettingsDB.getAlwaysOnline(),
    AUTO_TYPING: global.SettingsDB.getAutoTyping(),
    AUTO_RECORD: global.SettingsDB.getAutoRecord(),
    AUTO_READ: global.SettingsDB.getAutoRead(),
    AUTO_UPDATE: process.env.AUTO_UPDATE !== 'true',
    LOGS: process.env.LOGS === 'true' || true,
    ANTILINK_ACTION: process.env.ANTI_LINK || 'delete',
    SESSION_ID: process.env.SESSION_ID || '',
    PORT: process.env.PORT || 8000,
    HANDLERS: process.env.HANDLER || '.',
    BRANCH: 'main',
    PACKNAME: process.env.PACKNAME || 'MJDEV',
    AUTHOR: process.env.AUTHOR || 'M4STERJOSH',
    SUDO: global.SettingsDB.getSudoList(),
    CALL_REJECT: global.SettingsDB.getCallReject(),
    CALL_REJECT_MESSAGE: global.SettingsDB.getCallRejectMessage(),
    OWNER_NAME: process.env.OWNER_NAME || 'MJ',
    BOT_NAME: process.env.BOT_NAME || 'Axiom-MD',
    ALIVE_MESSAGE: global.SettingsDB.getAliveMessage(),
    ALIVE_IMAGE: global.SettingsDB.getAliveImage(),
    REPO_URL: process.env.REPO_URL || 'https://github.com/itsdevmj/Axiom-Md',
};
