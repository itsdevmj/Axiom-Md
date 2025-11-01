const { command, uptime } = require("../lib");
const { exec } = require("child_process");
const axios = require("axios");
const { getJson } = require("../lib");

// ============ ALIVE COMMAND ============
command({
    pattern: "alive",
    type: "misc",
    desc: "Bot status"
}, async (message, m, match) => {
    let bb = await uptime(process.uptime());
    let aliveMsg = global.config.ALIVE_MESSAGE || 'Hello {user}, all systems are functional\nUptime: {uptime}';

    // Replace placeholders
    aliveMsg = aliveMsg
        .replace(/{user}/g, message.pushName || 'User')
        .replace(/{uptime}/g, bb)
        .replace(/{bot}/g, global.config.BOT_NAME)
        .replace(/{owner}/g, global.config.OWNER_NAME);

    // Send with image if available
    if (global.config.ALIVE_IMAGE) {
        return await message.sendFromUrl(global.config.ALIVE_IMAGE, { caption: aliveMsg });
    }

    return message.reply(aliveMsg);
});

// ============ SET ALIVE MESSAGE ============
command({
    pattern: "setalive",
    type: "misc",
    desc: "Set custom alive message"
}, async (message, match) => {
    if (!match) {
        const imageStatus = global.config.ALIVE_IMAGE ? `\n*Current image:* Set` : `\n*Current image:* None`;
        return message.reply(`*Current alive message:*\n${global.config.ALIVE_MESSAGE}${imageStatus}\n\n*Usage:* .setalive <your message>\n\n*Available placeholders:*\n{user} - User's name\n{uptime} - Bot uptime\n{bot} - Bot name\n{owner} - Owner name\n\n*Tip:* Use .setaliveimg to set an image for the alive message`);
    }

    const result = global.SettingsDB.setAliveMessage(match);
    global.config.ALIVE_MESSAGE = match;

    return message.reply(`${result.message}\n\n*Preview:*\n${match.replace(/{user}/g, message.pushName || 'User').replace(/{uptime}/g, 'XX:XX:XX').replace(/{bot}/g, global.config.BOT_NAME).replace(/{owner}/g, global.config.OWNER_NAME)}\n\n*Tip:* Use .setaliveimg to add an image`);
});

// ============ SET ALIVE IMAGE ============
command({
    pattern: "setaliveimg",
    type: "misc",
    desc: "Set alive message image"
}, async (message, match) => {
    // Check if replying to an image
    if (message.reply_message && message.reply_message.image) {
        try {
            const imageUrl = await message.reply_message.downloadMediaMessage();
            const result = global.SettingsDB.setAliveImage(imageUrl);
            global.config.ALIVE_IMAGE = imageUrl;
            return message.reply(`${result.message}\n\nThe image will be displayed with your alive message.\n\n*Tip:* Use .setalive to customize the message text`);
        } catch (error) {
            return message.reply(`Error downloading image. Please try using an image URL instead.\n\n*Usage:* .setaliveimg <image URL>`);
        }
    }

    // Check if URL provided
    if (match) {
        const result = global.SettingsDB.setAliveImage(match);
        global.config.ALIVE_IMAGE = match;
        return message.reply(`${result.message}\n\n*Image URL:* ${match}\n\n*Tip:* Use .setalive to customize the message text`);
    }

    const currentStatus = global.config.ALIVE_IMAGE ? `*Current image:* Set` : `*Current image:* None`;
    return message.reply(`*Set Alive Image*\n\n${currentStatus}\n\n*Usage:*\n1. Reply to an image with .setaliveimg\n2. .setaliveimg <image URL>\n\n*Example:*\n.setaliveimg https://i.imgur.com/example.jpg\n\n*Other commands:*\n• .setalive - Set message text\n• .delaliveimg - Remove image\n• .alive - Test your alive message`);
});

// ============ REMOVE ALIVE IMAGE ============
command({
    pattern: "delaliveimg",
    type: "misc",
    desc: "Remove alive message image"
}, async (message) => {
    const result = global.SettingsDB.removeAliveImage();
    global.config.ALIVE_IMAGE = null;
    return message.reply(`${result.message}`);
});

// ============ SOCIALS AUTO DOWNLOAD ============
const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s]+/;
const facebookRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\s]+/;
const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/[^\s]+/;

command({
    pattern: "socials",
    on: "text",
    desc: "TT/FB/Insta",
    type: "auto",
}, async (message, match, m) => {
    if (
        !instagramRegex.test(match) &&
        !facebookRegex.test(match) &&
        !tiktokRegex.test(match)
    )
        return;

    try {
        if (instagramRegex.test(match)) {
            let data = await getJson(
                `https://api-ij32.onrender.com/igdl?url=${match}`
            );
            for (const { link, contentType } of data) {
                const response = await axios.get(link, { responseType: "arraybuffer" });
                const buffer = Buffer.from(response.data);

                if (contentType === "image/jpeg") {
                    await message.client.sendMessage(
                        message.jid,
                        { image: buffer, caption: "*Instagram image*" },
                        { quoted: m }
                    );
                } else {
                    await message.client.sendMessage(
                        message.jid,
                        { video: buffer, mimetype: "video/mp4" },
                        { quoted: m }
                    );
                }
            }
        } else if (facebookRegex.test(match)) {
            let { data } = await axios.get(
                `https://api-ij32.onrender.com/fb?url=${match}`
            );
            let videoUrl = data.data["720p (HD)"] || data.data["360p (SD)"];
            if (!videoUrl) return;

            const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
            const buffer = Buffer.from(response.data);

            await message.client.sendMessage(
                message.jid,
                { video: buffer, mimetype: "video/mp4" },
                { quoted: m }
            );
        } else {
            if (match == "https://www.tiktok.com/tiktoklite")
                return message.reply("You tweaking twin, that's an app url");

            let { data } = await axios.get(
                `https://apis.davidcyriltech.my.id/download/tiktokv3?url=${match}`
            );
            if (data.status == false) return;

            const response = await axios.get(data.video, { responseType: "arraybuffer" });
            const buffer = Buffer.from(response.data);

            await message.client.sendMessage(
                message.jid,
                {
                    video: buffer,
                    mimetype: "video/mp4",
                    caption: "Tiktok vid",
                },
                { quoted: m }
            );
        }
    } catch (error) {
        console.log("Error processing request:", error);
    }
});
