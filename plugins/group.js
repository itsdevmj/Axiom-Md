const { command, isAdmin } = require("../lib");

// ============ GROUP MANAGEMENT COMMAND ============
command({
    pattern: "group",
    fromMe: true,
    desc: "GC management",
    type: "group"
}, async (message, match, m) => {
    if (!message.jid.endsWith("@g.us")) return message.reply("only for groups");
    let bb = await isAdmin(message.jid, message.user, message.client)
    if (!bb) return message.reply("bot is not admin")
    if (!match) return message.reply("_choose from: open , close , modify and lock_");
    match = match.toLowerCase();

    let options = {
        "open": "not_announcement",
        "close": "announcement",
        "modify": "unlocked",
        "lock": "locked"
    };

    switch (options[match]) {
        case "not_announcement":
            await message.client.groupSettingUpdate(message.jid, 'not_announcement');
            break;
        case "announcement":
            await message.client.groupSettingUpdate(message.jid, 'announcement');
            break;
        case "unlocked":
            await message.client.groupSettingUpdate(message.jid, 'unlocked');
            break;
        case "locked":
            await message.client.groupSettingUpdate(message.jid, 'locked');
            break;
    }
});

// ============ PIN COMMAND ============
command({
    pattern: "pin",
    fromMe: true,
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
    fromMe: true,
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
