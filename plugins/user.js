const { command, runtime, parsedJid } = require("../lib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getDevice } = require("@whiskeysockets/baileys");

// ============ PING COMMAND ============
command({
    pattern: "ping",
    fromMe: true,
    desc: "Check bot response time",
    type: "user"
}, async (message, match, m) => {
    const start = Date.now();
    const sent = await message.reply("_Pinging..._");
    const end = Date.now();
    const responseTime = end - start;

    await message.client.sendMessage(message.jid, {
        text: `*Response Time:* ${responseTime}ms`,
        edit: sent.key
    });
});

// ============ UPDATE COMMAND ============
const GITHUB_REPO = process.env.GITHUB_REPO || "itsdevmj/Axiom-Md";
const BRANCH = global.config.BRANCH || "main";

async function getRepoFiles(repo, branch) {
    const apiUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
    const { data } = await axios.get(apiUrl);
    return data.tree.filter(item => item.type === "blob");
}

async function downloadFile(repo, branch, filePath) {
    const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
    const { data } = await axios.get(url);
    return data;
}

command({
    pattern: "update",
    fromMe: true,
    desc: "Check for updates and update bot from GitHub",
    type: "user"
}, async (message, match) => {
    try {
        const msg = await message.reply("_Checking for updates..._");

        const commitUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits/${BRANCH}`;
        const { data: commitData } = await axios.get(commitUrl);
        const commitMessage = commitData.commit.message;

        if (match === "now") {
            await message.client.sendMessage(message.jid, {
                text: "_Updating Axiom..._",
                edit: msg.key
            });

            try {
                const files = await getRepoFiles(GITHUB_REPO, BRANCH);

                for (const file of files) {
                    if (file.path.startsWith('.git') ||
                        file.path === 'config.env' ||
                        file.path.startsWith('session/') ||
                        file.path === 'resources/database.json') {
                        continue;
                    }

                    try {
                        const content = await downloadFile(GITHUB_REPO, BRANCH, file.path);
                        const filePath = path.join(process.cwd(), file.path);
                        const dir = path.dirname(filePath);

                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }

                        fs.writeFileSync(filePath, content);
                    } catch (err) {
                        console.error(`Failed to update ${file.path}:`, err.message);
                    }
                }

                await message.client.sendMessage(message.jid, {
                    text: "_Axiom Updated_",
                    edit: msg.key
                });

                setTimeout(() => process.exit(0), 1000);
            } catch (error) {
                return await message.reply(`_Update failed!_\n\n\`\`\`${error.message}\`\`\``);
            }
        } else {
            const updateMsg = `*Update Available!*\n\n${commitMessage}\n\n_Use .update now to update_`;
            await message.client.sendMessage(message.jid, {
                text: updateMsg,
                edit: msg.key
            });
        }

    } catch (error) {
        console.error(error);
        await message.reply(`_Error checking updates:_\n\n\`\`\`${error.message}\`\`\``);
    }
});

// ============ VIEW ONCE COMMAND ============
command({
    pattern: "vv",
    fromMe: true,
    desc: "Decrypt view once",
    type: "user"
}, async (message, match, m) => {
    if (!message.reply_message) return message.reply("_Reply to a view once message_");

    let media = await m.quoted.download();
    let type = message.reply_message.type;

    if (type === "imageMessage") {
        return message.client.sendMessage(message.jid, { image: media }, { quoted: m });
    } else if (type === "videoMessage") {
        return message.client.sendMessage(message.jid, { video: media }, { quoted: m });
    }
});

// ============ PLUGIN MANAGEMENT COMMANDS ============
command({
    pattern: "install",
    fromMe: true,
    desc: "Installs plugins",
    type: "user"
}, async (message, match) => {
    if (!match) return await message.reply("_Send a plugin URL_");
    let url;
    try {
        url = new URL(match);
    } catch (e) {
        console.log(e);
        return await message.reply("_Invalid URL_");
    }

    if (url.host === "gist.github.com") {
        url.host = "gist.githubusercontent.com";
        url = url.toString() + "/raw";
    } else {
        url = url.toString();
    }

    let plugin_name;
    try {
        const { data, status } = await axios.get(url);
        if (status === 200) {
            const command = data.match(/(?<=pattern:) ["'](.*?)["']/);
            plugin_name = command ? command[0].replace(/["']/g, "").trim().split(" ")[0] : "__" + Math.random().toString(36).substring(8);

            fs.writeFileSync(__dirname + "/" + plugin_name + ".js", data);
            try {
                require("./" + plugin_name);
            } catch (e) {
                fs.unlinkSync(__dirname + "/" + plugin_name + ".js");
                return await message.reply("Invalid Plugin\n```" + e + "```");
            }

            const success = await global.PluginDB.installPlugin(url, plugin_name);
            if (!success) {
                return await message.reply("_Plugin already installed_");
            }

            await message.reply(`_New plugin installed : ${plugin_name}_`);
        }
    } catch (error) {
        console.error(error);
        return await message.reply("Failed to fetch plugin");
    }
});

command({
    pattern: "plugins",
    fromMe: true,
    desc: "Plugin list",
    type: "user"
}, async (message, match) => {
    const plugins = await global.PluginDB.getPlugins();
    if (plugins.length < 1) {
        return await message.reply("_No external plugins installed_");
    }

    const msg = plugins.map(p => `\`${p.name}\`: ${p.url}`).join("\n");
    await message.reply(msg);
});

command({
    pattern: "remove",
    fromMe: true,
    desc: "Remove plugins",
    type: "user"
}, async (message, match) => {
    if (!match) return await message.reply("_Need a plugin name_");

    const success = await global.PluginDB.removePluginByName(match);
    if (!success) return await message.reply("_Plugin not found_");

    delete require.cache[require.resolve("./" + match + ".js")];
    fs.unlinkSync(__dirname + "/" + match + ".js");

    await message.reply(`Plugin ${match} deleted`);
});

// ============ SUDO MANAGEMENT COMMANDS ============
const validateNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
};

command({
    pattern: "setsudo",
    fromMe: true,
    desc: "Set sudo",
    type: "user"
}, async (message, match) => {
    if (!match) return await message.reply("_Please provide a number. Example: .setsudo 2348xxxxxxx_");

    const number = match.trim();
    if (!validateNumber(number)) {
        return await message.reply("_Invalid WhatsApp number format. Example: 2348xxxxxxx_");
    }

    const result = global.SettingsDB.addSudo(number);

    if (result.success) {
        global.config.SUDO = global.SettingsDB.getSudoList();
        await message.reply(`_Added ${number} to sudo users._`);
    } else {
        await message.reply(`_${result.message}_`);
    }
});

command({
    pattern: "delsudo",
    fromMe: true,
    desc: "Remove sudo",
    type: "user"
}, async (message, match) => {
    if (!match) return await message.reply("_Please provide a number. Example: .delsudo 2348xxxxxxx_");

    const number = match.trim();
    const result = global.SettingsDB.removeSudo(number);

    if (result.success) {
        global.config.SUDO = global.SettingsDB.getSudoList();
        await message.reply(`_Removed ${number} from sudo users._`);
    } else {
        await message.reply(`_${result.message}_`);
    }
});

command({
    pattern: "getsudo",
    fromMe: true,
    desc: "List sudo users",
    type: "user"
}, async (message) => {
    const sudoList = global.SettingsDB.getSudoList();
    if (sudoList.length === 0) {
        return await message.reply("_No sudo users configured._");
    }

    const formattedList = sudoList.map(num => `• ${num}`).join('\n');
    await message.reply(`*Sudo Users:*\n${formattedList}`);
});

command({
    pattern: "ban",
    fromMe: true,
    desc: "Ban a user from using the bot",
    type: "user"
}, async (message, match) => {
    let number;

    if (message.reply_message) {
        number = message.reply_message.sender.split("@")[0];
    } else if (match) {
        number = match.trim().replace(/\D/g, '');
    } else {
        return await message.reply("_Reply to a user or provide a number. Example: .ban 2348xxxxxxx_");
    }

    const result = global.SettingsDB.addBanned(number);

    if (result.success) {
        await message.reply(`_User ${number} has been banned._`);
    } else {
        await message.reply(`_${result.message}_`);
    }
});

command({
    pattern: "unban",
    fromMe: true,
    desc: "Unban a user",
    type: "user"
}, async (message, match) => {
    let number;

    if (message.reply_message) {
        number = message.reply_message.sender.split("@")[0];
    } else if (match) {
        number = match.trim().replace(/\D/g, '');
    } else {
        return await message.reply("_Reply to a user or provide a number. Example: .unban 2348xxxxxxx_");
    }

    const result = global.SettingsDB.removeBanned(number);

    if (result.success) {
        await message.reply(`_User ${number} has been unbanned._`);
    } else {
        await message.reply(`_${result.message}_`);
    }
});

command({
    pattern: "listban",
    fromMe: true,
    desc: "List all banned users",
    type: "user"
}, async (message) => {
    const bannedList = global.SettingsDB.getBannedList();
    if (bannedList.length === 0) {
        return await message.reply("_No banned users found._");
    }

    const formattedList = bannedList.map(num => `• ${num}`).join('\n');
    await message.reply(`*Banned Users:*\n${formattedList}`);
});

// ============ PRESENCE COMMANDS ============
command({
    pattern: "online",
    fromMe: true,
    desc: "Toggle always online mode",
    type: "user"
}, async (message, match) => {
    try {
        const args = match ? match.toLowerCase().trim() : "";

        if (args === "on") {
            global.SettingsDB.setAlwaysOnline(true);
            global.config.ALWAYS_ONLINE = true;
            await message.reply("_Always online mode enabled_");
        } else if (args === "off") {
            global.SettingsDB.setAlwaysOnline(false);
            global.config.ALWAYS_ONLINE = false;
            await message.reply("_Always online mode disabled_");
        } else {
            const status = global.config.ALWAYS_ONLINE ? "ON" : "OFF";
            await message.reply(
                `*Always Online Status*\n\n` +
                `Current: ${status}\n\n` +
                `*Usage:*\n` +
                `• Turn on: \`.online on\`\n` +
                `• Turn off: \`.online off\``
            );
        }
    } catch (error) {
        console.error("Error toggling online mode:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "typing",
    fromMe: true,
    desc: "Toggle auto-typing mode",
    type: "user"
}, async (message, match) => {
    try {
        const args = match ? match.toLowerCase().trim() : "";

        if (args === "on") {
            global.SettingsDB.setAutoTyping(true);
            global.config.AUTO_TYPING = true;
            global.config.AUTO_RECORD = false;
            await message.reply("_Auto-typing mode enabled_");
        } else if (args === "off") {
            global.SettingsDB.setAutoTyping(false);
            global.config.AUTO_TYPING = false;
            await message.reply("_Auto-typing mode disabled_");
        } else {
            const status = global.config.AUTO_TYPING ? "ON" : "OFF";
            await message.reply(
                `*Auto-Typing Status*\n\n` +
                `Current: ${status}\n\n` +
                `*Usage:*\n` +
                `• Turn on: \`.typing on\`\n` +
                `• Turn off: \`.typing off\``
            );
        }
    } catch (error) {
        console.error("Error toggling typing mode:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "record",
    fromMe: true,
    desc: "Toggle auto-recording mode",
    type: "user"
}, async (message, match) => {
    try {
        const args = match ? match.toLowerCase().trim() : "";

        if (args === "on") {
            global.SettingsDB.setAutoRecord(true);
            global.config.AUTO_RECORD = true;
            global.config.AUTO_TYPING = false;
            await message.reply("_Auto-recording mode enabled_");
        } else if (args === "off") {
            global.SettingsDB.setAutoRecord(false);
            global.config.AUTO_RECORD = false;
            await message.reply("_Auto-recording mode disabled_");
        } else {
            const status = global.config.AUTO_RECORD ? "ON" : "OFF";
            await message.reply(
                `*Auto-Recording Status*\n\n` +
                `Current: ${status}\n\n` +
                `*Usage:*\n` +
                `• Turn on: \`.record on\`\n` +
                `• Turn off: \`.record off\``
            );
        }
    } catch (error) {
        console.error("Error toggling recording mode:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "autoread",
    fromMe: true,
    desc: "Toggle auto-read mode",
    type: "user"
}, async (message, match) => {
    try {
        const args = match ? match.toLowerCase().trim() : "";

        if (args === "on") {
            global.SettingsDB.setAutoRead(true);
            global.config.AUTO_READ = true;
            await message.reply("_Auto-read mode enabled_");
        } else if (args === "off") {
            global.SettingsDB.setAutoRead(false);
            global.config.AUTO_READ = false;
            await message.reply("_Auto-read mode disabled_");
        } else {
            const status = global.config.AUTO_READ ? "ON" : "OFF";
            await message.reply(
                `*Auto-Read Status*\n\n` +
                `Current: ${status}\n\n` +
                `*Usage:*\n` +
                `• Turn on: \`.autoread on\`\n` +
                `• Turn off: \`.autoread off\``
            );
        }
    } catch (error) {
        console.error("Error toggling auto-read mode:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "presence",
    fromMe: true,
    desc: "View all presence settings",
    type: "user"
}, async (message, match) => {
    try {
        const onlineStatus = global.config.ALWAYS_ONLINE ? "ON" : "OFF";
        const typingStatus = global.config.AUTO_TYPING ? "ON" : "OFF";
        const recordStatus = global.config.AUTO_RECORD ? "ON" : "OFF";
        const readStatus = global.config.AUTO_READ ? "ON" : "OFF";

        await message.reply(
            `*Presence Settings*\n\n` +
            `Always Online: ${onlineStatus}\n` +
            `Auto-Typing: ${typingStatus}\n` +
            `Auto-Recording: ${recordStatus}\n` +
            `Auto-Read: ${readStatus}\n\n` +
            `*Commands:*\n` +
            `• \`.online on/off\`\n` +
            `• \`.typing on/off\`\n` +
            `• \`.record on/off\`\n` +
            `• \`.autoread on/off\``
        );
    } catch (error) {
        console.error("Error showing presence settings:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

// ============ CALL REJECT COMMANDS ============
command({
    pattern: "anticall",
    fromMe: true,
    desc: "Toggle auto call reject",
    type: "user"
}, async (message, match) => {
    try {
        const args = match ? match.toLowerCase().trim() : "";

        if (args === "on") {
            global.SettingsDB.setCallReject(true);
            global.config.CALL_REJECT = true;
            await message.reply("_Auto call reject enabled_");
        } else if (args === "off") {
            global.SettingsDB.setCallReject(false);
            global.config.CALL_REJECT = false;
            await message.reply("_Auto call reject disabled_");
        } else {
            const status = global.config.CALL_REJECT ? "ON" : "OFF";
            await message.reply(
                `*Auto Call Reject Status*\n\n` +
                `Current: ${status}\n` +
                `Message: ${global.config.CALL_REJECT_MESSAGE}\n\n` +
                `*Usage:*\n` +
                `• Turn on: \`.anticall on\`\n` +
                `• Turn off: \`.anticall off\`\n` +
                `• Set message: \`.setcallmsg <message>\``
            );
        }
    } catch (error) {
        console.error("Error toggling call reject:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "setcallmsg",
    fromMe: true,
    desc: "Set auto call reject message",
    type: "user"
}, async (message, match) => {
    if (!match) {
        return message.reply(`*Current call reject message:*\n${global.config.CALL_REJECT_MESSAGE}\n\n*Usage:* .setcallmsg <your message>\n\n*Example:*\n.setcallmsg Please do not call this number. Send a text message instead.`);
    }

    const result = global.SettingsDB.setCallRejectMessage(match);
    global.config.CALL_REJECT_MESSAGE = match;

    return message.reply(`${result.message}\n\n*New message:*\n${match}`);
});

// ============ PROFILE PICTURE COMMANDS ============
command({
    pattern: "setpp",
    fromMe: true,
    desc: "Set profile picture from quoted message or mentioned user",
    type: "user"
}, async (message, match) => {
    try {
        let imageBuffer;

        if (message.quoted && message.quoted.mtype === "imageMessage") {
            imageBuffer = await message.quoted.download();
        } else if (message.type === "imageMessage") {
            imageBuffer = await message.download();
        } else if (match && match.trim()) {
            const jids = parsedJid(match);
            if (jids && jids.length > 0) {
                const targetJid = jids[0];
                try {
                    let profilePic;
                    try {
                        profilePic = await message.client.profilePictureUrl(targetJid, "image");
                    } catch {
                        profilePic = await message.client.profilePictureUrl(targetJid);
                    }
                    const response = await axios.get(profilePic, { responseType: "arraybuffer" });
                    imageBuffer = Buffer.from(response.data);
                } catch (e) {
                    console.error("Error fetching profile picture:", e);
                    return await message.reply(`_Could not fetch profile picture._`);
                }
            }
        } else if (message.mentions && message.mentions.length > 0) {
            const targetJid = message.mentions[0];
            try {
                let profilePic;
                try {
                    profilePic = await message.client.profilePictureUrl(targetJid, "image");
                } catch {
                    profilePic = await message.client.profilePictureUrl(targetJid);
                }
                const response = await axios.get(profilePic, { responseType: "arraybuffer" });
                imageBuffer = Buffer.from(response.data);
            } catch (e) {
                console.error("Error fetching profile picture:", e);
                return await message.reply(`_Could not fetch profile picture._`);
            }
        } else if (message.quoted && message.quoted.sender) {
            const targetJid = message.quoted.sender;
            try {
                let profilePic;
                try {
                    profilePic = await message.client.profilePictureUrl(targetJid, "image");
                } catch {
                    profilePic = await message.client.profilePictureUrl(targetJid);
                }
                const response = await axios.get(profilePic, { responseType: "arraybuffer" });
                imageBuffer = Buffer.from(response.data);
            } catch (e) {
                console.error("Error fetching profile picture:", e);
                return await message.reply(`_Could not fetch profile picture._`);
            }
        } else {
            return await message.reply(
                "*Set Profile Picture*\n\n" +
                "*Usage:*\n" +
                "• Reply to an image\n" +
                "• Send an image with command\n" +
                "• Mention a user: `.setpp @user`\n" +
                "• Use phone number: `.setpp 1234567890`\n" +
                "• Reply to a user's message"
            );
        }

        if (!Buffer.isBuffer(imageBuffer)) {
            return await message.reply("_Failed to process image._");
        }

        await message.client.updateProfilePicture(message.client.user.id, imageBuffer);
        await message.reply("_Profile picture updated successfully!_");

    } catch (error) {
        console.error("Error setting profile picture:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

command({
    pattern: "getpp",
    fromMe: true,
    desc: "Get profile picture of mentioned user or quoted message sender",
    type: "user"
}, async (message, match) => {
    try {
        let targetJid;

        if (match && match.trim()) {
            const jids = parsedJid(match);
            if (jids && jids.length > 0) {
                targetJid = jids[0];
            }
        } else if (message.mentions && message.mentions.length > 0) {
            targetJid = message.mentions[0];
        } else if (message.quoted && message.quoted.sender) {
            targetJid = message.quoted.sender;
        } else {
            return await message.reply(
                "*Get Profile Picture*\n\n" +
                "*Usage:*\n" +
                "• Mention a user: `.getpp @user`\n" +
                "• Use phone number: `.getpp 1234567890`\n" +
                "• Reply to a user's message"
            );
        }

        if (!targetJid) {
            return await message.reply("_Invalid user or phone number._");
        }

        try {
            let profilePic;
            try {
                profilePic = await message.client.profilePictureUrl(targetJid, "image");
            } catch {
                profilePic = await message.client.profilePictureUrl(targetJid);
            }

            const response = await axios.get(profilePic, { responseType: "arraybuffer" });
            const imageBuffer = Buffer.from(response.data);

            const userName = targetJid.split("@")[0];
            await message.client.sendMessage(message.jid, {
                image: imageBuffer,
                caption: `Profile picture of @${userName}`,
                contextInfo: {
                    mentionedJid: [targetJid]
                }
            });
        } catch (e) {
            console.error("Error fetching profile picture:", e);
            await message.reply(`_User does not have a profile picture._`);
        }

    } catch (error) {
        console.error("Error getting profile picture:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

// ============ OWNER COMMAND ============
command({
    pattern: "owner",
    fromMe: false,
    desc: "Get owner contact",
    type: "user"
}, async (message) => {
    try {
        const ownerNumber = "2348142304526";
        const ownerName = "MasterJosh";

        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${ownerName}\n` +
            `ORG:Bot Owner;\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
            'END:VCARD';

        await message.client.sendMessage(message.jid, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

    } catch (error) {
        console.error("Error sending owner contact:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});

// ============ UPTIME COMMAND ============
command({
    pattern: "uptime",
    fromMe: false,
    desc: "Check bot uptime",
    type: "user"
}, async (message) => {
    try {
        const seconds = Math.floor(process.uptime());
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        let uptimeText = "";

        if (days > 0) uptimeText += `${days} day${days > 1 ? 's' : ''}\n`;
        if (hours > 0) uptimeText += `${hours} hour${hours > 1 ? 's' : ''}\n`;
        if (minutes > 0) uptimeText += `${minutes} minute${minutes > 1 ? 's' : ''}\n`;
        uptimeText += `${secs} second${secs > 1 ? 's' : ''}`;

        await message.reply(uptimeText);
    } catch (error) {
        console.error("Error getting uptime:", error);
        await message.reply(`_Error: ${error.message}_`);
    }
});
