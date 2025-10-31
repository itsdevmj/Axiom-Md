const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const path = require("path");
const fs = require("fs");
const pino = require("pino");
const logger = pino({ level: "silent" });
const axios = require("axios");
const { MakeSession } = require("./lib/session");
const { Message } = require("./lib/Messages");
const { serialize, parsedJid } = require("./lib");
const events = require("./lib/events");
const express = require("express");
const app = express();
const port = global.config.PORT;
const NodeCache = require('node-cache');
const EV = require("events");
EV.setMaxListeners(0);

global.cache = {
    groups: new NodeCache({ stdTTL: 400, checkperiod: 320, useClones: false }), /*stdTTL == Standard Time-To-Live , the rest should make sense homieðŸ¦¦*/
    messages: new NodeCache({ stdTTL: 60, checkperiod: 80, useClones: false }),
};

async function initializeSession() {
    if (!fs.existsSync("./resources/auth/creds.json")) {
        console.log("Session not found. Creating session...");
        try {
            await MakeSession(global.config.SESSION_ID, "./resources/auth");
            console.log("Session created successfully.");
        } catch (error) {
            console.error("Failed to create session:", error.message);
            process.exit(1);
        }
    }
}

try {
    fs.readdirSync(__dirname + "/resources/database/").forEach((db) => {
        if (path.extname(db).toLowerCase() == ".js") {
            require(__dirname + "/resources/database/" + db);
        }
    });
} catch (error) {
    console.error("Error loading databases:", error);
}

const p = async () => {
    try {
        fs.readdirSync("./plugins").forEach((plugin) => {
            if (path.extname(plugin).toLowerCase() == ".js") {
                require("./plugins/" + plugin);
            }
        });
    } catch (error) {
        console.error("Error loading plugins:", error);
    }
};

async function axiom() {
    try {
        console.log(`Syncing database`);
        const { state, saveCreds } = await useMultiFileAuthState(`./resources/auth/`);

        let conn = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS('Desktop'),
            downloadHistory: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            getMessage: false,
            emitOwnEvents: false,
            generateHighQualityLinkPreview: true,
            defaultQueryTimeoutMs: undefined,
            cachedGroupMetadata: async (jid) => {
                const cachedData = global.cache.groups.get(jid);
                if (cachedData) return cachedData;
                const metadata = await conn.groupMetadata(jid);
                global.cache.groups.set(jid, metadata);
                return metadata;
            }
        });

        conn.ev.on("call", async (c) => {
            try {
                if (global.config.CALL_REJECT === true) {
                    c = c.map((c) => c)[0];
                    let { status, from, id } = c;
                    if (status == "offer") {
                        await conn.rejectCall(id, from);
                        return conn.sendMessage(from, { text: global.config.CALL_REJECT_MESSAGE });
                    }
                }
            } catch (error) {
                console.error("Error handling call event:", error);
            }
        });

        conn.ev.on("connection.update", async (s) => {
            try {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    console.log("Connecting to WhatsApp...");
                    const userNumber = conn.user.id.split('@')[0].split(':')[0];
                    console.log(`Connected To ${userNumber}`);

                    const sudoList = global.SettingsDB.getSudoList();
                    if (sudoList && sudoList.length > 0) {
                        const packageJson = require('./package.json');
                        let startupMsg = `*Axiom Connected*\n\n`;
                        startupMsg += `*Version:* ${packageJson.version}\n\n`;

                        // Settings status
                        startupMsg += `*Settings:*\n`;
                        startupMsg += `• Mode: ${global.config.WORK_TYPE}\n`;
                        startupMsg += `• Always Online: ${global.SettingsDB.getAlwaysOnline() ? 'on' : 'off'}\n`;
                        startupMsg += `• Auto Read: ${global.SettingsDB.getAutoRead() ? 'on' : 'off'}\n`;
                        startupMsg += `• Auto Typing: ${global.SettingsDB.getAutoTyping() ? 'on' : 'off'}\n`;
                        startupMsg += `• Auto Record: ${global.SettingsDB.getAutoRecord() ? 'on' : 'off'}\n`;
                        startupMsg += `• Anti-Delete: ${global.SettingsDB.isAntiDeleteEnabled('global') ? 'on' : 'off'}\n`;
                        startupMsg += `• Auto Status View: ${global.SettingsDB.isAutoStatusEnabled() ? 'on' : 'off'}\n`;

                        // Check for updates
                        try {
                            const GITHUB_REPO = process.env.GITHUB_REPO || "itsdevmj/Axiom-Md";
                            const BRANCH = global.config.BRANCH || "main";
                            const commitUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits/${BRANCH}`;
                            const { data: commitData } = await axios.get(commitUrl);
                            const commitMessage = commitData.commit.message.split('\n')[0];
                            startupMsg += `\n*Latest Update:*\n${commitMessage}\n`;
                        } catch (error) { }

                        // Send only to first sudo
                        const firstSudo = sudoList[0];
                        const sudoJid = firstSudo.includes('@') ? firstSudo : firstSudo + '@s.whatsapp.net';
                        await conn.sendMessage(sudoJid, { text: startupMsg });
                    }
                }
                if (connection === "close") {
                    if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                        console.log("Reconnecting...");
                        await delay(300);
                        axiom();
                    } else {
                        console.log("Connection closed");
                        await delay(3000);
                        process.exit(0);
                    }
                }
            } catch (error) {
                console.error("Error in connection update:", error);
            }
        });

        conn.ev.on("creds.update", saveCreds);

        conn.ev.on("groups.update", async (events) => {
            for (const event of events) {
                try {
                    const metadata = await conn.groupMetadata(event.id);
                    global.cache.groups.set(event.id, metadata);
                } catch (err) {
                    console.error(`Failed to get group metadata for ${event.id}:`, err.message);
                    global.cache.groups.del(event.id); // Optional: clean it from cache
                }
            }
        });

        conn.ev.on("group-participants.update", async (event) => {
            try {
                const metadata = await conn.groupMetadata(event.id);
                global.cache.groups.set(event.id, metadata);
            } catch (err) {
                console.error(`Failed to get group metadata for ${event.id}:`, err.message);
                global.cache.groups.del(event.id);
            }
        });

        conn.ev.on("messages.update", async (updates) => {
            try {
                for (const update of updates) {
                    const chatId = update.key.remoteJid;
                    const messageId = update.key.id;

                    // if (global.config.LOGS) {
                    //     console.log("Message Update Event:", JSON.stringify(update, null, 2));
                    // }

                    const isDeleted = update.update?.message === null ||
                        update.update?.messageStubType === 68 ||
                        update.update?.messageStubType === 69;

                    if (isDeleted) {
                        const isStatusDeletion = chatId === "status@broadcast";

                        // if (global.config.LOGS) {
                        //     console.log(`Is status deletion: ${isStatusDeletion}`);
                        // }

                        // Check if antidelete is enabled for this type
                        if (isStatusDeletion) {
                            const statusEnabled = global.SettingsDB.isAntiDeleteStatusEnabled();
                            // if (global.config.LOGS) {
                            //     console.log(`Status antidelete enabled: ${statusEnabled}`);
                            // }
                            if (!statusEnabled) {
                                if (global.config.LOGS) {
                                    console.log(`Anti-delete status not enabled, skipping...`);
                                }
                                continue;
                            }
                        } else {
                            if (!global.SettingsDB.isAntiDeleteEnabled(chatId)) {
                                if (global.config.LOGS) {
                                    console.log(`Anti-delete not enabled`);
                                }
                                continue;
                            }
                        }

                        const cachedMsg = global.cache.messages.get(messageId);
                        if (!cachedMsg) {
                            continue;
                        }

                        // Status deletions always go to first sudo, regular messages follow mode setting
                        const sudoList = global.SettingsDB.getSudoList();
                        const firstSudo = sudoList && sudoList.length > 0 ? sudoList[0] + '@s.whatsapp.net' : null;

                        let botJid = conn.user.id;
                        // Remove :XX suffix if present and ensure @s.whatsapp.net suffix
                        if (botJid.includes(':')) {
                            botJid = botJid.split(':')[0];
                        }
                        if (!botJid.includes('@')) {
                            botJid = botJid + '@s.whatsapp.net';
                        }

                        let targetJid;

                        if (isStatusDeletion) {
                            // Always send status deletions to first sudo
                            targetJid = firstSudo || botJid;
                        } else {
                            // Regular messages follow the mode setting
                            const mode = global.SettingsDB.getAntiDeleteMode(chatId);
                            targetJid = mode === "dm" ? (firstSudo || botJid) : chatId;
                        }

                        // For status, get sender from update.key.participant, not from cache
                        const sender = isStatusDeletion
                            ? (update.key.participant || cachedMsg.sender || update.key.remoteJid)
                            : (cachedMsg.sender || update.key.participant || update.key.remoteJid);
                        const senderName = sender.split("@")[0];
                        const isGroup = chatId.endsWith("@g.us");
                        const isStatus = cachedMsg.isStatus || chatId === "status@broadcast";

                        // if (global.config.LOGS) {
                        //     console.log(`Preparing to send deleted message:`);
                        //     console.log(`  Target: ${targetJid}`);
                        //     console.log(`  Sender: ${sender}`);
                        //     console.log(`  Is Status: ${isStatus}`);
                        //     if (!isStatusDeletion) {
                        //         const mode = global.SettingsDB.getAntiDeleteMode(chatId);
                        //         console.log(`  Mode: ${mode}`);
                        //     }
                        // }

                        const isViewOnce = cachedMsg.isViewOnce || false;
                        const messageText = cachedMsg.text || (isViewOnce ? 'View-once message' : (isStatus ? 'Deleted status' : 'Deleted message'));
                        const conversationText = cachedMsg.text || (isViewOnce ? 'View-once message' : (isStatus ? 'Deleted status' : 'Deleted message'));
                        const messageTitle = isViewOnce ? `View-Once Message` : (isStatus ? `Deleted Status` : `Deleted Message`);
                        const messageBody = isViewOnce
                            ? `From: @${senderName}\nType: View-Once\nChat: ${isGroup ? "Group" : "Private"}`
                            : (isStatus
                                ? `From: @${senderName}\nType: Status/Broadcast`
                                : `From: @${senderName}\nChat: ${isGroup ? "Group" : "Private"}`);

                        if (global.config.LOGS && isViewOnce) {
                            console.log("View-once deletion detected:");
                            console.log(`  Has media: ${!!cachedMsg.media}`);
                            console.log(`  Type: ${cachedMsg.type}`);
                            console.log(`  Caption: ${cachedMsg.caption}`);
                        }

                        const isMediaMessage = (isViewOnce && cachedMsg.media) || (cachedMsg.media && ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(cachedMsg.type));

                        if (!isMediaMessage) {
                            const forwardedMessage = {
                                text: messageText,
                                contextInfo: {
                                    isForwarded: true,
                                    forwardingScore: 1,
                                    forwardedNewsletterMessageInfo: {
                                        serverMessageId: 1
                                    },
                                    quotedMessage: {
                                        conversation: conversationText
                                    },
                                    participant: sender,
                                    remoteJid: chatId,
                                    mentionedJid: [sender],
                                    externalAdReply: {
                                        title: messageTitle,
                                        body: messageBody,
                                        mediaType: 1,
                                        renderLargerThumbnail: false,
                                        showAdAttribution: false,
                                        previewType: "NONE"
                                    }
                                }
                            };
                            await conn.sendMessage(targetJid, forwardedMessage);
                        } else {
                            // Handle media messages
                            const mediaTypeLabel = isViewOnce ? `View-Once ${cachedMsg.type.replace('Message', '')}` : cachedMsg.type.replace('Message', '');
                            const caption = cachedMsg.caption || `Deleted ${mediaTypeLabel}\nFrom: @${senderName}`;
                            const mediaContextInfo = {
                                isForwarded: true,
                                forwardingScore: 1,
                                participant: sender,
                                remoteJid: chatId,
                                mentionedJid: [sender]
                            };

                            if (cachedMsg.type === "imageMessage") {
                                const imageCaption = isViewOnce
                                    ? `View-Once Image ${isStatus ? 'from status' : 'deleted'}\nFrom: @${senderName}\n${cachedMsg.caption ? `Caption: ${cachedMsg.caption}` : ''}`
                                    : (isStatus
                                        ? `Image deleted from status\nFrom: @${senderName}\n${cachedMsg.caption ? `\nCaption: ${cachedMsg.caption}` : ''}`
                                        : caption);
                                const imageContextInfo = {
                                    ...mediaContextInfo,
                                    externalAdReply: {
                                        title: isViewOnce ? "View-Once Image" : (isStatus ? "Deleted Status Image" : "Deleted Image"),
                                        body: `From: @${senderName}${isGroup && !isStatus ? ` • ${chatId.split('@')[0]}` : ''}`,
                                        mediaType: 1,
                                        renderLargerThumbnail: false,
                                        showAdAttribution: false,
                                        previewType: "NONE"
                                    }
                                };
                                await conn.sendMessage(targetJid, {
                                    image: cachedMsg.media,
                                    caption: imageCaption,
                                    contextInfo: imageContextInfo
                                });
                            } else if (cachedMsg.type === "videoMessage") {
                                const videoCaption = isViewOnce
                                    ? `View-Once Video ${isStatus ? 'from status' : 'deleted'}\nFrom: @${senderName}\n${cachedMsg.caption ? `Caption: ${cachedMsg.caption}` : ''}`
                                    : (isStatus
                                        ? `Video deleted from status\nFrom: @${senderName}\n${cachedMsg.caption ? `\nCaption: ${cachedMsg.caption}` : ''}`
                                        : caption);
                                const videoContextInfo = {
                                    ...mediaContextInfo,
                                    externalAdReply: {
                                        title: isViewOnce ? "View-Once Video" : (isStatus ? "Deleted Status Video" : "Deleted Video"),
                                        body: `From: @${senderName}${isGroup && !isStatus ? ` • ${chatId.split('@')[0]}` : ''}`,
                                        mediaType: 1,
                                        renderLargerThumbnail: false,
                                        showAdAttribution: false,
                                        previewType: "NONE"
                                    }
                                };
                                await conn.sendMessage(targetJid, {
                                    video: cachedMsg.media,
                                    caption: videoCaption,
                                    contextInfo: videoContextInfo
                                });
                            } else if (cachedMsg.type === "audioMessage") {
                                const audioContextInfo = {
                                    ...mediaContextInfo,
                                    externalAdReply: {
                                        title: isStatus ? "Deleted Status Audio" : "Deleted Audio",
                                        body: `From: @${senderName}${isGroup && !isStatus ? ` • ${chatId.split('@')[0]}` : ''}`,
                                        mediaType: 1,
                                        renderLargerThumbnail: false,
                                        showAdAttribution: false,
                                        previewType: "NONE"
                                    }
                                };
                                await conn.sendMessage(targetJid, {
                                    audio: cachedMsg.media,
                                    mimetype: "audio/mp4",
                                    contextInfo: audioContextInfo
                                });
                            } else if (cachedMsg.type === "stickerMessage") {
                                await conn.sendMessage(targetJid, {
                                    sticker: cachedMsg.media
                                });
                            } else if (cachedMsg.type === "documentMessage") {
                                await conn.sendMessage(targetJid, {
                                    document: cachedMsg.media,
                                    mimetype: cachedMsg.mimetype || "application/octet-stream",
                                    fileName: cachedMsg.fileName || "deleted_file",
                                    caption: caption,
                                    contextInfo: mediaContextInfo
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error handling message deletion:", error);
            }
        });

        conn.ev.on("messages.upsert", async (m) => {
            try {
                // Handle both regular messages and status updates
                const rawMsg = m.messages[0];
                const isStatus = rawMsg?.key?.remoteJid === "status@broadcast";

                // Cache status messages even if type is not "notify"
                if (isStatus && rawMsg?.key?.id) {
                    const messageType = Object.keys(rawMsg.message || {})[0];
                    const cacheData = {
                        text: rawMsg.message?.conversation ||
                            rawMsg.message?.extendedTextMessage?.text ||
                            rawMsg.message?.imageMessage?.caption ||
                            rawMsg.message?.videoMessage?.caption || null,
                        type: messageType,
                        caption: rawMsg.message?.imageMessage?.caption ||
                            rawMsg.message?.videoMessage?.caption || null,
                        media: null,
                        isStatus: true,
                        sender: rawMsg.key.participant || rawMsg.key.remoteJid
                    };

                    // Download media for image/video statuses
                    const isMediaStatus = ["imageMessage", "videoMessage", "audioMessage"].includes(messageType);
                    if (isMediaStatus) {
                        try {
                            const { downloadMediaMessage } = require("@whiskeysockets/baileys");
                            const buffer = await downloadMediaMessage(rawMsg, "buffer", {}, {
                                reuploadRequest: conn.updateMediaMessage
                            });
                            if (Buffer.isBuffer(buffer)) {
                                cacheData.media = buffer;
                            }
                        } catch (error) {
                            console.error("Error downloading status media:", error);
                        }
                    }

                    global.cache.messages.set(rawMsg.key.id, cacheData);

                    // Auto status view - mark status as read (non-blocking for faster execution)
                    if (global.SettingsDB.isAutoStatusEnabled()) {
                        conn.readMessages([rawMsg.key]).catch(error => {
                            console.error("Error auto-viewing status:", error);
                        });

                        if (global.config.LOGS) {
                            const statusSender = rawMsg.key.participant || rawMsg.key.remoteJid;
                            const senderName = statusSender.split("@")[0];
                        }
                    }
                }

                if (m.type !== "notify") return;

                let msg = await serialize(JSON.parse(JSON.stringify(m.messages[0])), conn);

                if (msg && msg.key && msg.key.id) {
                    const isRegularStatus = msg.key.remoteJid === "status@broadcast";

                    // Check if this is a view-once message
                    const quotedMsg = msg.message;
                    const isViewOnce =
                        msg.key?.isViewOnce === true ||
                        (quotedMsg?.imageMessage && quotedMsg.imageMessage.viewOnce) ||
                        (quotedMsg?.videoMessage && quotedMsg.videoMessage.viewOnce) ||
                        (quotedMsg?.audioMessage && quotedMsg.audioMessage.viewOnce) ||
                        quotedMsg?.viewOnceMessageV2 ||
                        quotedMsg?.viewOnceMessage ||
                        msg.type === "view_once";

                    // Global view-once detection logging
                    if (isViewOnce) {
                        const sender = msg.sender || msg.key.participant || msg.key.remoteJid;
                        const senderName = sender.split("@")[0];
                        const chatId = msg.key.remoteJid;
                        const isGroup = chatId.endsWith("@g.us");
                        const chatName = isGroup ? (await conn.groupMetadata(chatId).catch(() => ({ subject: chatId }))).subject : chatId;
                    }

                    const cacheData = {
                        text: msg.body || null,
                        type: msg.type,
                        caption: msg.message?.[msg.type]?.caption || null,
                        media: null,
                        isStatus: isRegularStatus,
                        isViewOnce: isViewOnce,
                        sender: msg.sender || msg.key.participant || msg.key.remoteJid
                    };

                    // For view-once messages, cache the media immediately
                    if (isViewOnce) {
                        // if (global.config.LOGS) {
                        //     console.log("Attempting to cache view-once media...");
                        //     console.log("Message keys:", Object.keys(rawMsg.message || {}));
                        //     console.log("Key.isViewOnce:", rawMsg.key?.isViewOnce);
                        // }

                        // Skip if message was already viewed (key.isViewOnce but no message content)
                        if (rawMsg.key?.isViewOnce === true && !rawMsg.message) {
                            if (global.config.LOGS) {
                                console.log("✗ View-once message already viewed - no content available");
                            }
                        } else {
                            try {
                                const { downloadMediaMessage } = require("@whiskeysockets/baileys");

                                // For view-once, we need to construct the message properly
                                const msgToDownload = {
                                    key: rawMsg.key,
                                    message: rawMsg.message
                                };

                                const buffer = await downloadMediaMessage(msgToDownload, "buffer", {}, {
                                    reuploadRequest: conn.updateMediaMessage
                                });

                                if (Buffer.isBuffer(buffer)) {
                                    cacheData.media = buffer;
                                    if (global.config.LOGS) {
                                        console.log(`✓ View-once media cached successfully (${buffer.length} bytes)`);
                                    }

                                    // Determine the actual media type from view-once wrapper
                                    let actualType = msg.type;
                                    let actualCaption = null;

                                    if (quotedMsg?.imageMessage && quotedMsg.imageMessage.viewOnce) {
                                        actualType = "imageMessage";
                                        actualCaption = quotedMsg.imageMessage.caption;
                                    } else if (quotedMsg?.videoMessage && quotedMsg.videoMessage.viewOnce) {
                                        actualType = "videoMessage";
                                        actualCaption = quotedMsg.videoMessage.caption;
                                    } else if (quotedMsg?.audioMessage && quotedMsg.audioMessage.viewOnce) {
                                        actualType = "audioMessage";
                                        actualCaption = quotedMsg.audioMessage.caption;
                                    } else if (quotedMsg?.viewOnceMessageV2) {
                                        const innerMessage = quotedMsg.viewOnceMessageV2.message;
                                        if (innerMessage.imageMessage) {
                                            actualType = "imageMessage";
                                            actualCaption = innerMessage.imageMessage.caption;
                                        } else if (innerMessage.videoMessage) {
                                            actualType = "videoMessage";
                                            actualCaption = innerMessage.videoMessage.caption;
                                        } else if (innerMessage.audioMessage) {
                                            actualType = "audioMessage";
                                            actualCaption = innerMessage.audioMessage.caption;
                                        }
                                    } else if (quotedMsg?.viewOnceMessage) {
                                        const innerMessage = quotedMsg.viewOnceMessage.message;
                                        if (innerMessage.imageMessage) {
                                            actualType = "imageMessage";
                                            actualCaption = innerMessage.imageMessage.caption;
                                        } else if (innerMessage.videoMessage) {
                                            actualType = "videoMessage";
                                            actualCaption = innerMessage.videoMessage.caption;
                                        } else if (innerMessage.audioMessage) {
                                            actualType = "audioMessage";
                                            actualCaption = innerMessage.audioMessage.caption;
                                        }
                                    }

                                    cacheData.type = actualType;
                                    cacheData.caption = actualCaption || cacheData.caption;
                                } else {
                                    if (global.config.LOGS) {
                                        console.log("✗ Failed to download view-once media - buffer is not valid");
                                    }
                                }
                            } catch (err) {
                                if (err.message?.includes("No message present") || err.data?.messageStubParameters?.includes("Message absent from node")) {
                                    if (global.config.LOGS) {
                                        console.log("✗ View-once media already expired/viewed - not available for caching");
                                    }
                                } else {
                                    console.error("✗ Error caching view-once media:", err);
                                }
                            }
                        }
                    } else if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(msg.type)) {
                        try {
                            const { downloadMediaMessage } = require("@whiskeysockets/baileys");
                            const buffer = await downloadMediaMessage(
                                { key: msg.key, message: msg.message },
                                "buffer",
                                {},
                                { reuploadRequest: conn.updateMediaMessage }
                            );
                            if (Buffer.isBuffer(buffer)) {
                                cacheData.media = buffer;
                                if (msg.type === "documentMessage") {
                                    cacheData.mimetype = msg.message[msg.type]?.mimetype;
                                    cacheData.fileName = msg.message[msg.type]?.fileName;
                                }
                            }
                        } catch (err) {
                            console.error("Error caching media:", err);
                        }
                    }

                    global.cache.messages.set(msg.key.id, cacheData);
                }

                if (!msg) return;

                let userNumber = msg.sender.split("@")[0];
                if (global.SettingsDB.isBanned(userNumber)) {
                    return;
                }

                let text_msg = msg.body;
                let prefix = global.config.HANDLERS.trim();

                // Check if message is a command (starts with prefix)
                const isCommand = text_msg && text_msg.startsWith(prefix);

                // Send presence updates only for non-command messages
                if (!isCommand) {
                    try {
                        if (global.config.AUTO_TYPING === true) {
                            await conn.sendPresenceUpdate("composing", msg.key.remoteJid);
                        } else if (global.config.AUTO_RECORD === true) {
                            await conn.sendPresenceUpdate("recording", msg.key.remoteJid);
                        }
                    } catch (error) {
                        console.error("Error updating auto presence:", error);
                    }
                }

                // Auto-read messages
                if (global.config.AUTO_READ === true) {
                    try {
                        await conn.readMessages([msg.key]);
                    } catch (error) {
                        console.error("Error auto-reading message:", error);
                    }
                }
                if (text_msg && global.config.LOGS) {
                    console.log(
                        `At : ${msg.from.endsWith("@g.us") ? (await conn.groupMetadata(msg.from)).subject : msg.from}\nFrom : ${msg.sender}\nMessage:${text_msg}\nSudo:${msg.sudo}`
                    );
                }

                events.commands.map(async (command) => {
                    if (command.fromMe && !msg.sudo) return;

                    let prefix = global.config.HANDLERS.trim();
                    let comman = text_msg;

                    if (command?.pattern instanceof RegExp && typeof comman === "string") {
                        try {
                            const regex = new RegExp(`^${command.pattern.source}`);
                            const cmd = msg.body.match(regex);
                            comman = cmd && cmd[0]?.startsWith(prefix) ? cmd[0] : false;
                        } catch (error) {
                            console.error("Error matching command pattern:", error);
                        }
                    }

                    msg.prefix = prefix;

                    try {
                        if (global.config.ALWAYS_ONLINE === true) {
                            conn.sendPresenceUpdate("available", msg.key.remoteJid);
                        } else {
                            conn.sendPresenceUpdate("unavailable", msg.key.remoteJid);
                        }
                    } catch (error) {
                        console.error("Error updating presence:", error);
                    }

                    let whats;
                    let match;
                    try {
                        switch (true) {
                            case command.pattern && command.pattern.test(comman):
                                match = text_msg.replace(new RegExp(command.pattern, "i"), "").trim();
                                whats = new Message(conn, msg);
                                command.function(whats, match, msg, conn);
                                break;
                            case text_msg && command.on === "text":
                                whats = new Message(conn, msg);
                                command.function(whats, text_msg, msg, conn, m);
                                break;
                            case command.on === "image" && msg.type === "imageMessage":
                            case command.on === "photo" && msg.type === "imageMessage":
                            case command.on === "sticker" && msg.type === "stickerMessage":
                            case command.on === "video" && msg.type === "videoMessage":
                                whats = new Message(conn, msg);
                                command.function(whats, text_msg, msg, conn, m);
                                break;
                        }
                    } catch (error) {
                        console.error(`Error executing command: ${error}`);
                    }
                });
            } catch (error) {
                console.error("Error processing message:", error);
            }
        });
    } catch (error) {
        console.error("Error in axiom function:", error);
    }
}

app.get("/", (req, res) => res.type("html").send(`<p2>Hello world</p2>`));

app.listen(port, () => console.log(`Server listening on http://localhost:${port}!`));

async function startBot() {
    try {
        await initializeSession();
        await p();
        axiom();
    } catch (error) {
        console.error("Fatal error in startup:", error);
        process.exit(1);
    }
}

startBot();
