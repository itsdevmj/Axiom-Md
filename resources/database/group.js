const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database.json");

function readDB() {
    try {
        const data = fs.readFileSync(dbPath, "utf8");
        const parsed = JSON.parse(data);

        if (!parsed.welcome) {
            parsed.welcome = {};
        }

        return parsed;
    } catch (error) {
        console.error("Error reading database:", error.message);
        return { welcome: {} };
    }
}

function writeDB(data) {
    data.metadata = data.metadata || {};
    data.metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function setWelcome(groupJid, enabled) {
    const db = readDB();

    if (!db.welcome[groupJid]) {
        db.welcome[groupJid] = {
            enabled: false,
            message: 'Welcome @user to @group! 👋',
            goodbye: false,
            goodbyeMessage: 'Goodbye @user! 👋'
        };
    }

    db.welcome[groupJid].enabled = enabled;
    writeDB(db);
    return { success: true, message: `Welcome ${enabled ? 'enabled' : 'disabled'}` };
}

function isWelcomeEnabled(groupJid) {
    const db = readDB();
    return db.welcome?.[groupJid]?.enabled || false;
}

function setWelcomeMessage(groupJid, message) {
    const db = readDB();

    if (!db.welcome[groupJid]) {
        db.welcome[groupJid] = {
            enabled: false,
            message: message,
            goodbye: false,
            goodbyeMessage: 'Goodbye @user! 👋'
        };
    } else {
        db.welcome[groupJid].message = message;
    }

    writeDB(db);
    return { success: true, message: 'Welcome message updated' };
}

function getWelcomeMessage(groupJid) {
    const db = readDB();
    return db.welcome?.[groupJid]?.message || 'Welcome @user to @group! 👋';
}

function setGoodbye(groupJid, enabled) {
    const db = readDB();

    if (!db.welcome[groupJid]) {
        db.welcome[groupJid] = {
            enabled: false,
            message: 'Welcome @user to @group! 👋',
            goodbye: enabled,
            goodbyeMessage: 'Goodbye @user! 👋'
        };
    } else {
        db.welcome[groupJid].goodbye = enabled;
    }

    writeDB(db);
    return { success: true, message: `Goodbye ${enabled ? 'enabled' : 'disabled'}` };
}

function isGoodbyeEnabled(groupJid) {
    const db = readDB();
    return db.welcome?.[groupJid]?.goodbye || false;
}

function setGoodbyeMessage(groupJid, message) {
    const db = readDB();

    if (!db.welcome[groupJid]) {
        db.welcome[groupJid] = {
            enabled: false,
            message: 'Welcome @user to @group! 👋',
            goodbye: false,
            goodbyeMessage: message
        };
    } else {
        db.welcome[groupJid].goodbyeMessage = message;
    }

    writeDB(db);
    return { success: true, message: 'Goodbye message updated' };
}

function getGoodbyeMessage(groupJid) {
    const db = readDB();
    return db.welcome?.[groupJid]?.goodbyeMessage || 'Goodbye @user! 👋';
}

function getSettings(groupJid) {
    const db = readDB();
    return db.welcome?.[groupJid] || {
        enabled: false,
        message: 'Welcome @user to @group! 👋',
        goodbye: false,
        goodbyeMessage: 'Goodbye @user! 👋'
    };
}

global.WelcomeDB = {
    setWelcome,
    isWelcomeEnabled,
    setWelcomeMessage,
    getWelcomeMessage,
    setGoodbye,
    isGoodbyeEnabled,
    setGoodbyeMessage,
    getGoodbyeMessage,
    getSettings
};

module.exports = global.WelcomeDB;


// ============ ANTILINK FUNCTIONS ============
function setAntilink(groupJid, enabled) {
    const db = readDB();

    if (!db.antilink) {
        db.antilink = {};
    }

    if (!db.antilink[groupJid]) {
        db.antilink[groupJid] = {
            enabled: false,
            action: 'delete'
        };
    }

    db.antilink[groupJid].enabled = enabled;
    writeDB(db);
    return { success: true, message: `Antilink ${enabled ? 'enabled' : 'disabled'}` };
}

function isAntilinkEnabled(groupJid) {
    const db = readDB();
    return db.antilink?.[groupJid]?.enabled || false;
}

function setAntilinkAction(groupJid, action) {
    const db = readDB();

    if (!db.antilink) {
        db.antilink = {};
    }

    if (!db.antilink[groupJid]) {
        db.antilink[groupJid] = {
            enabled: false,
            action: action
        };
    } else {
        db.antilink[groupJid].action = action;
    }

    writeDB(db);
    return { success: true, message: `Antilink action set to: ${action}` };
}

function getAntilinkAction(groupJid) {
    const db = readDB();
    return db.antilink?.[groupJid]?.action || 'delete';
}

function getAntilinkSettings(groupJid) {
    const db = readDB();
    return db.antilink?.[groupJid] || {
        enabled: false,
        action: 'delete'
    };
}

global.WelcomeDB = {
    setWelcome,
    isWelcomeEnabled,
    setWelcomeMessage,
    getWelcomeMessage,
    setGoodbye,
    isGoodbyeEnabled,
    setGoodbyeMessage,
    getGoodbyeMessage,
    getSettings,
    setAntilink,
    isAntilinkEnabled,
    setAntilinkAction,
    getAntilinkAction,
    getAntilinkSettings
};


// ============ ANTIWORD FUNCTIONS ============
function setAntiword(groupJid, enabled) {
  const db = readDB();
  
  if (!db.antiword) {
    db.antiword = {};
  }
  
  if (!db.antiword[groupJid]) {
    db.antiword[groupJid] = {
      enabled: false,
      action: 'delete',
      words: []
    };
  }
  
  db.antiword[groupJid].enabled = enabled;
  writeDB(db);
  return { success: true, message: `Antiword ${enabled ? 'enabled' : 'disabled'}` };
}

function isAntiwordEnabled(groupJid) {
  const db = readDB();
  return db.antiword?.[groupJid]?.enabled || false;
}

function setAntiwordAction(groupJid, action) {
  const db = readDB();
  
  if (!db.antiword) {
    db.antiword = {};
  }
  
  if (!db.antiword[groupJid]) {
    db.antiword[groupJid] = {
      enabled: false,
      action: action,
      words: []
    };
  } else {
    db.antiword[groupJid].action = action;
  }
  
  writeDB(db);
  return { success: true, message: `Antiword action set to: ${action}` };
}

function getAntiwordAction(groupJid) {
  const db = readDB();
  return db.antiword?.[groupJid]?.action || 'delete';
}

function addBannedWord(groupJid, word) {
  const db = readDB();
  
  if (!db.antiword) {
    db.antiword = {};
  }
  
  if (!db.antiword[groupJid]) {
    db.antiword[groupJid] = {
      enabled: false,
      action: 'delete',
      words: []
    };
  }
  
  const lowerWord = word.toLowerCase();
  if (db.antiword[groupJid].words.includes(lowerWord)) {
    return { success: false, message: 'Word already in banned list' };
  }
  
  db.antiword[groupJid].words.push(lowerWord);
  writeDB(db);
  return { success: true, message: `Added "${word}" to banned words` };
}

function removeBannedWord(groupJid, word) {
  const db = readDB();
  
  if (!db.antiword?.[groupJid]?.words) {
    return { success: false, message: 'No banned words found' };
  }
  
  const lowerWord = word.toLowerCase();
  const index = db.antiword[groupJid].words.indexOf(lowerWord);
  
  if (index === -1) {
    return { success: false, message: 'Word not found in banned list' };
  }
  
  db.antiword[groupJid].words.splice(index, 1);
  writeDB(db);
  return { success: true, message: `Removed "${word}" from banned words` };
}

function getBannedWords(groupJid) {
  const db = readDB();
  return db.antiword?.[groupJid]?.words || [];
}

function getAntiwordSettings(groupJid) {
  const db = readDB();
  return db.antiword?.[groupJid] || {
    enabled: false,
    action: 'delete',
    words: []
  };
}

global.WelcomeDB = {
  setWelcome,
  isWelcomeEnabled,
  setWelcomeMessage,
  getWelcomeMessage,
  setGoodbye,
  isGoodbyeEnabled,
  setGoodbyeMessage,
  getGoodbyeMessage,
  getSettings,
  setAntilink,
  isAntilinkEnabled,
  setAntilinkAction,
  getAntilinkAction,
  getAntilinkSettings,
  setAntiword,
  isAntiwordEnabled,
  setAntiwordAction,
  getAntiwordAction,
  addBannedWord,
  removeBannedWord,
  getBannedWords,
  getAntiwordSettings
};
