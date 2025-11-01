const { command } = require("../lib");
const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);
const git = simpleGit();
const REPO_URL = global.config.REPO_URL;
const BRANCH = global.config.BRANCH || 'main';

// ============ ENSURE REPO ============
async function ensureRepo() {
    try {
        const gitDir = path.join(process.cwd(), '.git');
        if (!fs.existsSync(gitDir)) {
            await git.init();
            await git.addRemote('origin', REPO_URL);
            await git.fetch('origin');
            await git.reset(['--hard', `origin/${BRANCH}`]);
        }
        return true;
    } catch (error) {
        console.error('Error ensuring repo:', error);
        return false;
    }
}

// ============ CHECK UPDATES ============
async function checkUpdates() {
    try {
        await git.fetch('origin', BRANCH);
        const status = await git.status();
        const commits = await git.log([`HEAD..origin/${BRANCH}`]);

        return {
            hasUpdate: status.behind > 0,
            commits: commits
        };
    } catch (error) {
        console.error('Error checking updates:', error);
        return { hasUpdate: false, commits: null };
    }
}

// ============ UPDATE COMMAND ============
command({
    pattern: "update",
    type: "misc",
    desc: "Check for bot updates"
}, async (message, match) => {
    const action = match ? match.toLowerCase().trim() : '';

    try {
        // Ensure git repo is initialized
        const repoReady = await ensureRepo();
        if (!repoReady) {
            return message.reply("_Failed to initialize git repository. Please check your setup._");
        }

        // Check for updates
        const checkMsg = await message.reply("_Checking for updates..._");
        const updateInfo = await checkUpdates();

        if (!updateInfo.hasUpdate) {
            return message.client.sendMessage(message.jid, {
                text: "_You're running the latest version!_",
                edit: checkMsg.key
            });
        }

        // Format commit messages
        let commitList = '';
        if (updateInfo.commits && updateInfo.commits.all && updateInfo.commits.all.length > 0) {
            commitList = '\n\n*Recent Updates:*\n';
            updateInfo.commits.all.slice(0, 5).forEach((commit, index) => {
                const msg = commit.message.split('\n')[0];
                commitList += `${index + 1}. ${msg}\n`;
            });

            if (updateInfo.commits.all.length > 5) {
                commitList += `\n_...and ${updateInfo.commits.all.length - 5} more updates_`;
            }
        }

        if (action === 'now') {
            const statusMsg = await message.reply("_Updating bot... Please wait._");

            try {
                // Pull latest changes
                await message.client.sendMessage(message.jid, {
                    text: "_Pulling latest changes..._",
                    edit: statusMsg.key
                });
                await git.pull('origin', BRANCH, { '--rebase': 'true' });

                // Install dependencies
                await message.client.sendMessage(message.jid, {
                    text: "_Installing dependencies..._",
                    edit: statusMsg.key
                });
                await execAsync('npm install --legacy-peer-deps');

                await message.client.sendMessage(message.jid, {
                    text: "_Update completed successfully!_\n\n_Restarting bot..._",
                    edit: statusMsg.key
                });

                // Restart the bot
                setTimeout(() => {
                    process.exit(0);
                }, 2000);

            } catch (error) {
                console.error('Update error:', error);
                return message.client.sendMessage(message.jid, {
                    text: `_Update failed: ${error.message}_\n\n_Please update manually or contact support._`,
                    edit: statusMsg.key
                });
            }
        } else {
            return message.reply(`*Update Available!*${commitList}\n\n*To update, use:*\n.update now\n\n_Bot will restart after update_`);
        }

    } catch (error) {
        console.error('Update command error:', error);
        return message.reply(`_Error: ${error.message}_`);
    }
});

// ============ REPO INFO COMMAND ============
command({
    pattern: "repo",
    type: "misc",
    desc: "Get repository information"
}, async (message) => {
    try {
        const repoReady = await ensureRepo();
        if (!repoReady) {
            return message.reply(`*Repository:* ${REPO_URL}\n*Branch:* ${BRANCH}\n\n_Git not initialized_`);
        }

        const remotes = await git.getRemotes(true);
        const branch = await git.branch();
        const log = await git.log({ maxCount: 1 });

        let repoInfo = `*Repository Information*\n\n`;
        repoInfo += `*URL:* ${REPO_URL}\n`;
        repoInfo += `*Branch:* ${branch.current}\n`;

        if (log.latest) {
            repoInfo += `*Latest Commit:* ${log.latest.message.split('\n')[0]}\n`;
            repoInfo += `*Author:* ${log.latest.author_name}\n`;
            repoInfo += `*Date:* ${new Date(log.latest.date).toLocaleDateString()}\n`;
        }

        repoInfo += `\n*Commands:*\n`;
        repoInfo += `• .update - Check for updates\n`;
        repoInfo += `• .update now - Update bot`;

        return message.reply(repoInfo);

    } catch (error) {
        console.error('Repo command error:', error);
        return message.reply(`*Repository:* ${REPO_URL}\n*Branch:* ${BRANCH}\n\n_Error: ${error.message}_`);
    }
});
