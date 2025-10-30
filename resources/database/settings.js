const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database.json");

function initDB() {
  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      const initialData = {
        sudo: [],
        settings: {
          antilink: false,
          alwaysOnline: false,
          autoTyping: false,
          autoRecord: false,
          autoRead: false,
          callReject: false,
          workType: "private",
          logs: true
        },
        banned: [],
        antiDelete: {
          enabled: {},
          mode: {}
        },
        metadata: {
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error("Error initializing database:", error.message);
  }
}

function readDB() {
  try {
    initDB();
    const data = fs.readFileSync(dbPath, "utf8");
    const parsed = JSON.parse(data);

    if (!parsed.sudo) parsed.sudo = [];
    if (!parsed.banned) parsed.banned = [];
    if (!parsed.settings) parsed.settings = {};
    if (!parsed.metadata) parsed.metadata = {};

    return parsed;
  } catch (error) {
    console.error("Error reading database:", error.message);
    initDB();
    return readDB();
  }
}

function writeDB(data) {
  data.metadata.lastUpdated = new Date().toISOString();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function addSudo(number) {
  const db = readDB();
  const cleanNumber = number.replace(/[^0-9]/g, "");

  if (db.sudo.includes(cleanNumber)) {
    return { success: false, message: "User already exists in sudo list" };
  }

  db.sudo.push(cleanNumber);
  writeDB(db);
  return { success: true, message: "User added to sudo list" };
}

function removeSudo(number) {
  const db = readDB();
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const index = db.sudo.indexOf(cleanNumber);

  if (index === -1) {
    return { success: false, message: "User not found in sudo list" };
  }

  db.sudo.splice(index, 1);
  writeDB(db);
  return { success: true, message: "User removed from sudo list" };
}

function getSudoList() {
  const db = readDB();
  return db.sudo;
}

function isSudo(number) {
  try {
    const db = readDB();
    const cleanNumber = number.replace(/[^0-9]/g, "");
    return db.sudo && Array.isArray(db.sudo) && db.sudo.includes(cleanNumber);
  } catch (error) {
    console.error("Error checking sudo status:", error.message);
    return false;
  }
}

function updateSetting(key, value) {
  const db = readDB();

  if (!db.settings.hasOwnProperty(key)) {
    return { success: false, message: "Invalid setting key" };
  }

  db.settings[key] = value;
  writeDB(db);
  return { success: true, message: "Setting updated successfully" };
}

function getSetting(key) {
  const db = readDB();
  return db.settings[key];
}

function getAllSettings() {
  const db = readDB();
  return db.settings;
}

function addBanned(number) {
  const db = readDB();
  const cleanNumber = number.replace(/[^0-9]/g, "");

  if (db.banned.includes(cleanNumber)) {
    return { success: false, message: "User already banned" };
  }

  db.banned.push(cleanNumber);
  writeDB(db);
  return { success: true, message: "User banned successfully" };
}

function removeBanned(number) {
  const db = readDB();
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const index = db.banned.indexOf(cleanNumber);

  if (index === -1) {
    return { success: false, message: "User not found in banned list" };
  }

  db.banned.splice(index, 1);
  writeDB(db);
  return { success: true, message: "User unbanned successfully" };
}

function isBanned(number) {
  try {
    const db = readDB();
    const cleanNumber = number.replace(/[^0-9]/g, "");
    return db.banned && Array.isArray(db.banned) && db.banned.includes(cleanNumber);
  } catch (error) {
    console.error("Error checking banned status:", error.message);
    return false;
  }
}

function getBannedList() {
  const db = readDB();
  return db.banned;
}

function enableAntiDelete(jid, mode = "chat") {
  const db = readDB();

  if (!db.antiDelete) {
    db.antiDelete = { enabled: {}, mode: {} };
  }

  db.antiDelete.enabled[jid] = true;
  db.antiDelete.mode[jid] = mode;
  writeDB(db);

  if (jid === "global") {
    return { success: true, message: `Anti-delete enabled globally for all chats (mode: ${mode})` };
  }
  return { success: true, message: `Anti-delete enabled for this chat (mode: ${mode})` };
}

function disableAntiDelete(jid) {
  const db = readDB();

  if (!db.antiDelete) {
    return { success: false, message: "Anti-delete not configured" };
  }

  delete db.antiDelete.enabled[jid];
  delete db.antiDelete.mode[jid];
  writeDB(db);

  if (jid === "global") {
    return { success: true, message: "Anti-delete disabled globally" };
  }
  return { success: true, message: "Anti-delete disabled for this chat" };
}

function isAntiDeleteEnabled(jid) {
  const db = readDB();
  // Check if enabled globally or for specific chat
  return db.antiDelete?.enabled?.["global"] || db.antiDelete?.enabled?.[jid] || false;
}

function getAntiDeleteMode(jid) {
  const db = readDB();
  // Check global mode first, then specific chat mode
  return db.antiDelete?.mode?.["global"] || db.antiDelete?.mode?.[jid] || "chat";
}

function setAntiDeleteMode(jid, mode) {
  const db = readDB();

  if (!db.antiDelete) {
    db.antiDelete = { enabled: {}, mode: {} };
  }

  if (!db.antiDelete.enabled[jid]) {
    return { success: false, message: "Anti-delete not enabled" };
  }

  db.antiDelete.mode[jid] = mode;
  writeDB(db);

  if (jid === "global") {
    return { success: true, message: `Anti-delete mode set to: ${mode} (applies to all chats)` };
  }
  return { success: true, message: `Anti-delete mode set to: ${mode}` };
}

function enableAntiDeleteStatus() {
  const db = readDB();

  if (!db.antiDelete) {
    db.antiDelete = { enabled: {}, mode: {} };
  }

  db.antiDelete.statusEnabled = true;
  writeDB(db);
  return { success: true, message: "Anti-delete enabled for status" };
}

function disableAntiDeleteStatus() {
  const db = readDB();

  if (!db.antiDelete) {
    return { success: false, message: "Anti-delete not configured" };
  }

  db.antiDelete.statusEnabled = false;
  writeDB(db);
  return { success: true, message: "Anti-delete disabled for status" };
}

function isAntiDeleteStatusEnabled() {
  const db = readDB();
  return db.antiDelete?.statusEnabled || false;
}

function enableAutoStatus() {
  const db = readDB();

  if (!db.autoStatus) {
    db.autoStatus = { enabled: false };
  }

  db.autoStatus.enabled = true;
  writeDB(db);
  return { success: true, message: "Auto status view enabled - All statuses will be automatically viewed" };
}

function disableAutoStatus() {
  const db = readDB();

  if (!db.autoStatus) {
    return { success: false, message: "Auto status not configured" };
  }

  db.autoStatus.enabled = false;
  writeDB(db);
  return { success: true, message: "Auto status view disabled" };
}

function isAutoStatusEnabled() {
  const db = readDB();
  return db.autoStatus?.enabled || false;
}

function setAlwaysOnline(enabled) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.alwaysOnline = enabled;
  writeDB(db);
  return { success: true, message: `Always online ${enabled ? 'enabled' : 'disabled'}` };
}

function getAlwaysOnline() {
  const db = readDB();
  return db.settings?.alwaysOnline || false;
}

function setAutoTyping(enabled) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.autoTyping = enabled;
  if (enabled) db.settings.autoRecord = false;
  writeDB(db);
  return { success: true, message: `Auto-typing ${enabled ? 'enabled' : 'disabled'}` };
}

function getAutoTyping() {
  const db = readDB();
  return db.settings?.autoTyping || false;
}

function setAutoRecord(enabled) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.autoRecord = enabled;
  if (enabled) db.settings.autoTyping = false;
  writeDB(db);
  return { success: true, message: `Auto-record ${enabled ? 'enabled' : 'disabled'}` };
}

function getAutoRecord() {
  const db = readDB();
  return db.settings?.autoRecord || false;
}

function setAutoRead(enabled) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.autoRead = enabled;
  writeDB(db);
  return { success: true, message: `Auto-read ${enabled ? 'enabled' : 'disabled'}` };
}

function getAutoRead() {
  const db = readDB();
  return db.settings?.autoRead || false;
}

function setAliveMessage(message) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.aliveMessage = message;
  writeDB(db);
  return { success: true, message: 'Alive message updated successfully' };
}

function getAliveMessage() {
  const db = readDB();
  return db.settings?.aliveMessage || 'Hello {user}, all systems are functional\nUptime: {uptime}';
}

function setAliveImage(imageUrl) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.aliveImage = imageUrl;
  writeDB(db);
  return { success: true, message: 'Alive image updated successfully' };
}

function getAliveImage() {
  const db = readDB();
  return db.settings?.aliveImage || null;
}

function removeAliveImage() {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.aliveImage = null;
  writeDB(db);
  return { success: true, message: 'Alive image removed successfully' };
}

function setCallReject(enabled) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.callReject = enabled;
  writeDB(db);
  return { success: true, message: `Auto call reject ${enabled ? 'enabled' : 'disabled'}` };
}

function getCallReject() {
  const db = readDB();
  return db.settings?.callReject || false;
}

function setCallRejectMessage(message) {
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.callRejectMessage = message;
  writeDB(db);
  return { success: true, message: 'Call reject message updated successfully' };
}

function getCallRejectMessage() {
  const db = readDB();
  return db.settings?.callRejectMessage || 'Auto call reject is enabled. Please do not call this number.';
}

initDB();

global.SettingsDB = {
  addSudo,
  removeSudo,
  getSudoList,
  isSudo,
  updateSetting,
  getSetting,
  getAllSettings,
  addBanned,
  removeBanned,
  isBanned,
  getBannedList,
  enableAntiDelete,
  disableAntiDelete,
  isAntiDeleteEnabled,
  getAntiDeleteMode,
  setAntiDeleteMode,
  enableAntiDeleteStatus,
  disableAntiDeleteStatus,
  isAntiDeleteStatusEnabled,
  enableAutoStatus,
  disableAutoStatus,
  isAutoStatusEnabled,
  setAlwaysOnline,
  getAlwaysOnline,
  setAutoTyping,
  getAutoTyping,
  setAutoRecord,
  getAutoRecord,
  setAutoRead,
  getAutoRead,
  setAliveMessage,
  getAliveMessage,
  setAliveImage,
  getAliveImage,
  removeAliveImage,
  setCallReject,
  getCallReject,
  setCallRejectMessage,
  getCallRejectMessage
};
