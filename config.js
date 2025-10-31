const fs = require('fs');

if (fs.existsSync('config.env')) {
    require('dotenv').config({
        path: './config.env'
    });
}

require('./resources/database/settings');

const envSudo = process.env.SUDO ? process.env.SUDO.split(',').map(s => s.trim()) : ['2348142304526'];
envSudo.forEach(number => {
    if (number && !global.SettingsDB.isSudo(number)) {
        global.SettingsDB.addSudo(number);
    }
});

global.config = {
    ANTILINK: process.env.ANTI_LINK === 'true' || false,
    ALWAYS_ONLINE: global.SettingsDB.getAlwaysOnline(),
    AUTO_TYPING: global.SettingsDB.getAutoTyping(),
    AUTO_RECORD: global.SettingsDB.getAutoRecord(),
    AUTO_READ: global.SettingsDB.getAutoRead(),
    LOGS: process.env.LOGS === 'true' || true,
    ANTILINK_ACTION: process.env.ANTI_LINK || 'kick',
    SESSION_ID: process.env.SESSION_ID || '',
    PORT: process.env.PORT || 8000,
    HANDLERS: process.env.HANDLER || '.',
    BRANCH: 'main',
    PACKNAME: process.env.PACKNAME || '',
    AUTHOR: process.env.AUTHOR || 'M4STERJOSH',
    SUDO: global.SettingsDB.getSudoList(),
    CALL_REJECT: global.SettingsDB.getCallReject(),
    CALL_REJECT_MESSAGE: global.SettingsDB.getCallRejectMessage(),
    OWNER_NAME: process.env.OWNER_NAME || 'MJ',
    BOT_NAME: process.env.BOT_NAME || 'Axiom-MD',
    WORK_TYPE: process.env.WORK_TYPE || 'private',
    ALIVE_MESSAGE: global.SettingsDB.getAliveMessage(),
    ALIVE_IMAGE: global.SettingsDB.getAliveImage(),
};
