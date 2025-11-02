const { command } = require("../lib");
const { checkForUpdates, updateLocal, restartBot } = require("../lib/updater");

// ============ ANTI-DELETE COMMAND ============
command({
    pattern: "antidelete",
    desc: "Enable/disable anti-delete globally",
    type: "utility"
}, async (message, match) => {
    try {
        const args = match.trim().toLowerCase().split(" ");
        const action = args[0];

        if (!action || !["on", "off", "mode"].includes(action)) {
            return await message.reply(
                "Usage:\n" +
                ".antidelete on - Enable anti-delete globally (all chats)\n" +
                ".antidelete off - Disable anti-delete\n" +
                ".antidelete mode chat - Send deleted messages in original chat\n" +
                ".antidelete mode dm - Send deleted messages to your DM"
            );
        }

        if (action === "on") {
            const result = global.SettingsDB.enableAntiDelete("global", "chat");
            await message.reply(result.message);
        } else if (action === "off") {
            const result = global.SettingsDB.disableAntiDelete("global");
            await message.reply(result.message);
        } else if (action === "mode") {
            const mode = args[1];

            if (!mode || !["chat", "dm"].includes(mode)) {
                return await message.reply("Invalid mode. Use: chat or dm");
            }

            const result = global.SettingsDB.setAntiDeleteMode("global", mode);
            await message.reply(result.message);
        }
    } catch (error) {
        await message.reply(`Error: ${error.message}`);
    }
});

// ============ ANTI-DELETE STATUS COMMAND ============
command({
    pattern: "antidelstatus",
    desc: "Enable/disable anti-delete for status",
    type: "utility"
}, async (message, match) => {
    try {
        const args = match.trim().toLowerCase().split(" ");
        const action = args[0];

        if (!action || !["on", "off"].includes(action)) {
            return await message.reply(
                "Usage:\n" +
                ".antideletestatus on - Enable anti-delete for statuses\n" +
                ".antideletestatus off - Disable anti-delete for statuses"
            );
        }

        if (action === "on") {
            const result = global.SettingsDB.enableAntiDeleteStatus();
            await message.reply(result.message);
        } else if (action === "off") {
            const result = global.SettingsDB.disableAntiDeleteStatus();
            await message.reply(result.message);
        }
    } catch (error) {
        await message.reply(`Error: ${error.message}`);
    }
});

// ============ AUTO STATUS COMMAND ============
command({
    pattern: "status",
    desc: "Enable/disable auto status view",
    type: "utility"
}, async (message, match) => {
    try {
        const args = match.trim().toLowerCase().split(" ");
        const action = args[0];

        if (!action || !["on", "off"].includes(action)) {
            return await message.reply(
                "Usage:\n" +
                ".status on - Enable auto status view\n" +
                ".status off - Disable auto status view"
            );
        }

        if (action === "on") {
            const result = global.SettingsDB.enableAutoStatus();
            await message.reply(result.message);
        } else if (action === "off") {
            const result = global.SettingsDB.disableAutoStatus();
            await message.reply(result.message);
        }
    } catch (error) {
        await message.reply(`Error: ${error.message}`);
    }
});

// ============ UPDATE CHECKER COMMAND ============
command({
    pattern: "update",
    desc: "Check for bot updates",
    type: "utility"
}, async (message) => {
    try {
        await message.reply("_Checking for updates..._");
        
        const updateInfo = await checkForUpdates();
        
        if (!updateInfo.hasUpdates) {
            return await message.reply(updateInfo.message);
        }
        
        await message.reply(updateInfo.message);
    } catch (error) {
        console.error("Error in update command:", error);
        await message.reply("_An error occurred while checking for updates._");
    }
});

// ============ UPDATE NOW COMMAND ============
command({
    pattern: "updatenow",
    desc: "Update bot to latest version",
    type: "utility"
}, async (message) => {
    try {
        await message.reply("_Starting update..._");
        
        const result = await updateLocal();
        
        await message.reply(result.message);
        
        if (result.success && result.updated) {
            await message.reply("_Restarting bot..._");
            restartBot();
        }
    } catch (error) {
        console.error("Error in updatenow command:", error);
        await message.reply("_Update failed. Please check logs._");
    }
});
