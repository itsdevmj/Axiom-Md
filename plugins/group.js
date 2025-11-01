const { command, isAdmin } = require("../lib");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// ============ PIN COMMAND ============
command({
    pattern: "pin",
    desc: "Pin a message in group",
    type: "group"
}, async (message, match, m) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message) return message.reply("_Reply to a message to pin it_");

    try {
        await message.client.sendMessage(message.jid, {
            pin: message.reply_message.key
        });
        await message.reply("_Message pinned successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to pin message_");
    }
});

// ============ UNPIN COMMAND ============
command({
    pattern: "unpin",
    desc: "Unpin a message in group",
    type: "group"
}, async (message, match, m) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message) return message.reply("_Reply to a pinned message to unpin it_");

    try {
        await message.client.sendMessage(message.jid, {
            unpin: message.reply_message.key
        });
        await message.reply("_Message unpinned successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to unpin message_");
    }
});

// ============ LOCK COMMAND ============
command({
    pattern: "lock",
    desc: "Lock group settings (only admins can modify)",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    try {
        await message.client.groupSettingUpdate(message.jid, 'locked');
        await message.reply("_Group settings locked. Only admins can modify group info_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to lock group settings_");
    }
});

// ============ UNLOCK COMMAND ============
command({
    pattern: "unlock",
    desc: "Unlock group settings (all members can modify)",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    try {
        await message.client.groupSettingUpdate(message.jid, 'unlocked');
        await message.reply("_Group settings unlocked. All members can modify group info_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to unlock group settings_");
    }
});

// ============ CLOSE COMMAND ============
command({
    pattern: "mute",
    desc: "Close group (only admins can send messages)",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    try {
        await message.client.groupSettingUpdate(message.jid, 'announcement');
        await message.reply("_Muted_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to close group_");
    }
});

// ============ OPEN COMMAND ============
command({
    pattern: "unmute",
    desc: "Open group (all members can send messages)",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    try {
        await message.client.groupSettingUpdate(message.jid, 'not_announcement');
        await message.reply("_Unmuted_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to open group_");
    }
});

// ============ SET NAME COMMAND ============
command({
    pattern: "setname",
    desc: "Change group name",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!match) return message.reply("_Provide a new group name_\n\nExample: .setname My Group");

    try {
        await message.client.groupUpdateSubject(message.jid, match);
        await message.reply(`_Group name changed to: ${match}_`);
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to change group name_");
    }
});

// ============ SET DESCRIPTION COMMAND ============
command({
    pattern: "setdesc",
    desc: "Change group description",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!match) return message.reply("_Provide a new group description_\n\nExample: .setdesc Welcome to my group");

    try {
        await message.client.groupUpdateDescription(message.jid, match);
        await message.reply("_Group description updated successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to change group description_");
    }
});

// ============ SET GROUP PP COMMAND ============
command({
    pattern: "setgpp",
    desc: "Change group profile picture",
    type: "group"
}, async (message, match, m) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message || !message.reply_message.image) {
        return message.reply("_Reply to an image to set it as group profile picture_");
    }

    try {
        const imageBuffer = await m.quoted.download();

        await message.client.updateProfilePicture(message.jid, imageBuffer);
        await message.reply("_Group profile picture updated successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to update group profile picture_");
    }
});

// ============ KICK COMMAND ============
command({
    pattern: "kick",
    desc: "Kick a user from group",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message && !message.mention) {
        return message.reply("_Reply to a user or mention them to kick_");
    }

    try {
        const user = message.reply_message ? message.reply_message.sender : message.mention[0];
        await message.client.groupParticipantsUpdate(message.jid, [user], "remove");
        await message.reply("_User kicked successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to kick user_");
    }
});

// ============ ADD COMMAND ============
command({
    pattern: "add",
    desc: "Add a user to group",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!match) return message.reply("_Provide a phone number_\n\nExample: .add 1234567890");

    try {
        const number = match.replace(/[^0-9]/g, '');
        const user = number + '@s.whatsapp.net';
        await message.client.groupParticipantsUpdate(message.jid, [user], "add");
        await message.reply("_User added successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to add user. They may have privacy settings enabled_");
    }
});

// ============ PROMOTE COMMAND ============
command({
    pattern: "promote",
    desc: "Promote a user to admin",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message && !message.mention) {
        return message.reply("_Reply to a user or mention them to promote_");
    }

    try {
        const user = message.reply_message ? message.reply_message.sender : message.mention[0];
        await message.client.groupParticipantsUpdate(message.jid, [user], "promote");
        await message.reply("_User promoted to admin successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to promote user_");
    }
});

// ============ DEMOTE COMMAND ============
command({
    pattern: "demote",
    desc: "Demote an admin to member",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    let bb = await isAdmin(message.jid, message.user, message.client);
    if (!bb) return message.reply("_Bot is not admin_");

    if (!message.reply_message && !message.mention) {
        return message.reply("_Reply to a user or mention them to demote_");
    }

    try {
        const user = message.reply_message ? message.reply_message.sender : message.mention[0];
        await message.client.groupParticipantsUpdate(message.jid, [user], "demote");
        await message.reply("_User demoted to member successfully_");
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to demote user_");
    }
});

// ============ GROUP INFO COMMAND ============
command({
    pattern: "ginfo",
    desc: "Get group information",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    try {
        const metadata = await message.client.groupMetadata(message.jid);
        const admins = metadata.participants.filter(p => p.admin !== null).length;
        const members = metadata.participants.length;

        let info = `*Group Information*\n\n`;
        info += `*Name:* ${metadata.subject}\n`;
        info += `*Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n`;
        info += `*Members:* ${members}\n`;
        info += `*Admins:* ${admins}\n`;
        info += `*Description:*\n${metadata.desc || 'No description'}`;

        await message.reply(info);
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to get group information_");
    }
});

// ============ TAG COMMAND ============
command({
    pattern: "tag",
    desc: "Resend replied message and tag all members",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");
    
    if (!message.reply_message) return message.reply("_Reply to a message to tag all members with it_");

    try {
        const metadata = await message.client.groupMetadata(message.jid);
        const participants = metadata.participants.map(p => p.phoneNumber || p.id);

        const repliedMsg = message.reply_message;
        
        // Handle different message types
        if (repliedMsg.text) {
            await message.client.sendMessage(message.jid, {
                text: repliedMsg.text,
                mentions: participants
            });
        } else if (repliedMsg.message.imageMessage) {
            const buffer = await downloadMediaMessage(repliedMsg, "buffer", {}, {
                reuploadRequest: message.client.updateMediaMessage
            });
            await message.client.sendMessage(message.jid, {
                image: buffer,
                caption: repliedMsg.message.imageMessage.caption || "",
                mentions: participants
            });
        } else if (repliedMsg.message.videoMessage) {
            const buffer = await downloadMediaMessage(repliedMsg, "buffer", {}, {
                reuploadRequest: message.client.updateMediaMessage
            });
            await message.client.sendMessage(message.jid, {
                video: buffer,
                caption: repliedMsg.message.videoMessage.caption || "",
                mentions: participants
            });
        } else {
            await message.reply("_Unsupported message type_");
        }
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to tag all members_");
    }
});

// ============ TAG ALL COMMAND ============
command({
    pattern: "tagall",
    desc: "Tag all group members",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    try {
        const metadata = await message.client.groupMetadata(message.jid);
        const participants = metadata.participants.map(p => p.phoneNumber || p.id);

        const text = match || "Hello everyone!";

        await message.client.sendMessage(message.jid, {
            text: text,
            mentions: participants
        });
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to tag all members_");
    }
});

// ============ LEAVE COMMAND ============
command({
    pattern: "leave",
    desc: "Bot leaves the group",
    type: "group"
}, async (message) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    try {
        await message.reply("_Goodbye!_");
        await message.client.groupLeave(message.jid);
    } catch (error) {
        console.error(error);
        await message.reply("_Failed to leave group_");
    }
});

// ============ WELCOME COMMAND ============
command({
    pattern: "welcome",
    desc: "Manage welcome messages",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    if (!match) {
        const settings = global.WelcomeDB.getSettings(message.jid);
        let info = `*Welcome Settings*\n\n`;
        info += `*Status:* ${settings.enabled ? 'Enabled ✓' : 'Disabled ✗'}\n`;
        info += `*Message:* ${settings.message}\n\n`;
        info += `*Usage:*\n`;
        info += `• .welcome on - Enable\n`;
        info += `• .welcome off - Disable\n`;
        info += `• .welcome <message> - Set message\n\n`;
        info += `*Variables:*\n`;
        info += `• @user - Mention user\n`;
        info += `• @group - Group name\n`;
        info += `• @count - Member count`;
        return message.reply(info);
    }

    match = match.toLowerCase();

    if (match === "on") {
        const result = global.WelcomeDB.setWelcome(message.jid, true);
        return message.reply(result.message);
    }

    if (match === "off") {
        const result = global.WelcomeDB.setWelcome(message.jid, false);
        return message.reply(result.message);
    }

    // Set custom message
    const result = global.WelcomeDB.setWelcomeMessage(message.jid, match);
    await message.reply(`${result.message}\n\n*Preview:*\n${match.replace(/@user/g, '@YourName').replace(/@group/g, 'Group Name').replace(/@count/g, '10')}`);
});

// ============ GOODBYE COMMAND ============
command({
    pattern: "goodbye",
    desc: "Manage goodbye messages",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    if (!match) {
        const settings = global.WelcomeDB.getSettings(message.jid);
        let info = `*Goodbye Settings*\n\n`;
        info += `*Status:* ${settings.goodbye ? 'Enabled ✓' : 'Disabled ✗'}\n`;
        info += `*Message:* ${settings.goodbyeMessage}\n\n`;
        info += `*Usage:*\n`;
        info += `• .goodbye on - Enable\n`;
        info += `• .goodbye off - Disable\n`;
        info += `• .goodbye <message> - Set message\n\n`;
        info += `*Variables:*\n`;
        info += `• @user - Mention user\n`;
        info += `• @group - Group name\n`;
        info += `• @count - Member count`;
        return message.reply(info);
    }

    match = match.toLowerCase();

    if (match === "on") {
        const result = global.WelcomeDB.setGoodbye(message.jid, true);
        return message.reply(result.message);
    }

    if (match === "off") {
        const result = global.WelcomeDB.setGoodbye(message.jid, false);
        return message.reply(result.message);
    }

    // Set custom message
    const result = global.WelcomeDB.setGoodbyeMessage(message.jid, match);
    await message.reply(`${result.message}\n\n*Preview:*\n${match.replace(/@user/g, '@YourName').replace(/@group/g, 'Group Name').replace(/@count/g, '10')}`);
});

// ============ ANTILINK COMMAND ============
command({
    pattern: "antilink",
    desc: "Manage antilink protection",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    if (!match) {
        const settings = global.WelcomeDB.getAntilinkSettings(message.jid);
        let info = `*Antilink Settings*\n\n`;
        info += `*Status:* ${settings.enabled ? 'Enabled ✓' : 'Disabled ✗'}\n`;
        info += `*Action:* ${settings.action}\n\n`;
        info += `*Usage:*\n`;
        info += `• .antilink on - Enable\n`;
        info += `• .antilink off - Disable\n`;
        info += `• .antilink delete - Delete message\n`;
        info += `• .antilink warn - Warn user\n`;
        info += `• .antilink kick - Kick user\n\n`;
        info += `*Note:* Group admins are immune to antilink`;
        return message.reply(info);
    }

    match = match.toLowerCase();

    if (match === "on") {
        const result = global.WelcomeDB.setAntilink(message.jid, true);
        return message.reply(result.message);
    }

    if (match === "off") {
        const result = global.WelcomeDB.setAntilink(message.jid, false);
        return message.reply(result.message);
    }

    if (["delete", "warn", "kick"].includes(match)) {
        const result = global.WelcomeDB.setAntilinkAction(message.jid, match);
        return message.reply(result.message);
    }

    return message.reply("_Invalid option. Use: on, off, delete, warn, or kick_");
});

// ============ ANTIWORD COMMAND ============
command({
    pattern: "antiword",
    desc: "Manage antiword protection",
    type: "group"
}, async (message, match) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("_This command only works in groups_");

    if (!match) {
        const settings = global.WelcomeDB.getAntiwordSettings(message.jid);
        const wordList = settings.words.length > 0 ? settings.words.join(', ') : 'None';
        
        let info = `*Antiword Settings*\n\n`;
        info += `*Status:* ${settings.enabled ? 'Enabled ✓' : 'Disabled ✗'}\n`;
        info += `*Action:* ${settings.action}\n`;
        info += `*Banned Words:* ${wordList}\n\n`;
        info += `*Usage:*\n`;
        info += `• .antiword on - Enable\n`;
        info += `• .antiword off - Disable\n`;
        info += `• .antiword delete - Delete message\n`;
        info += `• .antiword warn - Warn user\n`;
        info += `• .antiword kick - Kick user\n`;
        info += `• .antiword add <word> - Add banned word\n`;
        info += `• .antiword remove <word> - Remove word\n`;
        info += `• .antiword list - Show all banned words\n\n`;
        info += `*Note:* Group admins are immune to antiword`;
        return message.reply(info);
    }

    const args = match.split(' ');
    const cmd = args[0].toLowerCase();
    const word = args.slice(1).join(' ');

    if (cmd === "on") {
        const result = global.WelcomeDB.setAntiword(message.jid, true);
        return message.reply(result.message);
    }

    if (cmd === "off") {
        const result = global.WelcomeDB.setAntiword(message.jid, false);
        return message.reply(result.message);
    }

    if (["delete", "warn", "kick"].includes(cmd)) {
        const result = global.WelcomeDB.setAntiwordAction(message.jid, cmd);
        return message.reply(result.message);
    }

    if (cmd === "add") {
        if (!word) return message.reply("_Provide a word to ban_\n\nExample: .antiword add badword");
        const result = global.WelcomeDB.addBannedWord(message.jid, word);
        return message.reply(result.message);
    }

    if (cmd === "remove") {
        if (!word) return message.reply("_Provide a word to remove_\n\nExample: .antiword remove badword");
        const result = global.WelcomeDB.removeBannedWord(message.jid, word);
        return message.reply(result.message);
    }

    if (cmd === "list") {
        const words = global.WelcomeDB.getBannedWords(message.jid);
        if (words.length === 0) {
            return message.reply("_No banned words set for this group_");
        }
        let list = `*Banned Words (${words.length})*\n\n`;
        words.forEach((word, i) => {
            list += `${i + 1}. ${word}\n`;
        });
        return message.reply(list);
    }

    return message.reply("_Invalid option. Use: on, off, delete, warn, kick, add, remove, or list_");
});
