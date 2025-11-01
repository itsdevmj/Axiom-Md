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

// ============ UPDATE COMMAND ============
command({
    pattern: "update",
    type: "misc",
    desc: "Check and update bot from GitHub"
}, async (message, match) => {
    const repo = process.env.REPO || "https://github.com/M4STERJOSH/Axiom-MD";
    const branch = global.config.BRANCH || "main";
    const forceUpdate = match && match.toLowerCase() === "now";

    try {
        await message.reply("Checking for updates...");

        exec("git status", async (error, stdout, stderr) => {
            if (error) {
                return message.reply(`Git not initialized. Please clone the repository properly.\n\nError: ${error.message}`);
            }

            exec(`git fetch origin ${branch}`, async (fetchError, fetchStdout, fetchStderr) => {
                if (fetchError) {
                    return message.reply(`Failed to fetch updates.\n\nError: ${fetchError.message}`);
                }

                exec(`git rev-list HEAD...origin/${branch} --count`, async (countError, countStdout, countStderr) => {
                    if (countError) {
                        return message.reply(`Failed to check updates.\n\nError: ${countError.message}`);
                    }

                    const updateCount = parseInt(countStdout.trim());

                    if (updateCount === 0 && !forceUpdate) {
                        return message.reply("Bot is already up to date!");
                    }

                    exec(`git log HEAD..origin/${branch} --oneline`, async (logError, logStdout, logStderr) => {
                        const commits = logStdout.trim() || "No commit details available";

                        if (updateCount > 0) {
                            await message.reply(`*${updateCount} update(s) available*\n\n*Recent changes:*\n${commits}\n\n_Updating now..._`);
                        } else if (forceUpdate) {
                            await message.reply(`*Force updating...*\n\nResetting to latest version from ${branch} branch.`);
                        }

                        const pullCmd = forceUpdate ? `git reset --hard origin/${branch}` : `git pull origin ${branch}`;

                        exec(pullCmd, async (pullError, pullStdout, pullStderr) => {
                            if (pullError) {
                                return message.reply(`Failed to update.\n\nError: ${pullError.message}\n\nTry: .update now (force update)`);
                            }

                            exec("npm install", async (npmError, npmStdout, npmStderr) => {
                                if (npmError) {
                                    return message.reply(`Update successful but dependency installation failed.\n\nPlease run: npm install\n\nError: ${npmError.message}`);
                                }

                                await message.reply(`*Update completed successfully!*\n\n${pullStdout}\n\n_Restarting bot..._`);

                                setTimeout(() => {
                                    process.exit(0);
                                }, 2000);
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        return message.reply(`Update failed: ${error.message}`);
    }
});

// ============ VERSION COMMAND ============
command({
    pattern: "version",
    type: "misc",
    desc: "Check bot version and commit info"
}, async (message) => {
    const branch = global.config.BRANCH || "main";

    exec("git log -1 --format='%H%n%h%n%s%n%cr'", async (error, stdout, stderr) => {
        if (error) {
            return message.reply(`Failed to get version info.\n\nError: ${error.message}`);
        }

        const [fullHash, shortHash, commitMsg, timeAgo] = stdout.trim().split('\n');

        exec(`git rev-list HEAD...origin/${branch} --count`, async (countError, countStdout) => {
            const updateCount = countError ? "Unknown" : parseInt(countStdout.trim());
            const updateStatus = updateCount === 0 ? "Up to date" : `${updateCount} update(s) available`;

            const versionInfo = `*Bot Version Info*\n\n` +
                `*Version:* ${require('../package.json').version}\n` +
                `*Branch:* ${branch}\n` +
                `*Commit:* ${shortHash}\n` +
                `*Message:* ${commitMsg}\n` +
                `*Updated:* ${timeAgo}\n` +
                `*Status:* ${updateStatus}\n\n` +
                `_Use .update to update the bot_`;

            return message.reply(versionInfo);
        });
    });
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
