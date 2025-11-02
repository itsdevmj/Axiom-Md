const simpleGit = require('simple-git');
const { exec } = require('child_process');
const git = simpleGit();

/**
 * Get config values with fallbacks
 */
function getConfig() {
    const config = global.config || {};
    return {
        REPO_URL: config.REPO_URL || process.env.REPO_URL || 'https://github.com/itsdevmj/Axiom-Md',
        BRANCH: config.BRANCH || process.env.BRANCH || 'main',
        AUTO_UPDATE: config.AUTO_UPDATE !== undefined ? config.AUTO_UPDATE : false
    };
}

/**
 * Check and initialize git repository if needed
 */
async function checkAndInitializeGitRepo() {
    const isGitRepo = await git.checkIsRepo();
    if (!isGitRepo) {
        try {
            await git.init();
            const { REPO_URL } = getConfig();
            await git.addRemote('origin', REPO_URL);
        } catch (error) {
            console.error('Error initializing git repository:', error);
            throw new Error('Failed to initialize git repository');
        }
    }
}

/**
 * Check for available updates
 * @returns {Promise<Object>} - Returns update status and changelog
 */
async function checkForUpdates() {
    try {
        await checkAndInitializeGitRepo();
        await git.fetch();

        const status = await git.status();
        const commits = await git.log(['HEAD..origin/' + config.BRANCH]);

        if (commits.total === 0) {
            return {
                hasUpdates: false,
                message: '_Bot is up to date!_',
                commits: []
            };
        }

        let changelog = '_Pending updates:_\n\n';
        commits.all.forEach((commit, index) => {
            changelog += `${index + 1}. ${commit.message}\n`;
        });

        return {
            hasUpdates: true,
            message: changelog + '\n\nType *.updatenow* to start update',
            commits: commits.all,
            total: commits.total
        };
    } catch (error) {
        console.error('Error checking for updates:', error);
        throw error;
    }
}

/**
 * Perform local update (pull from git)
 * @returns {Promise<Object>} - Returns update result
 */
async function updateLocal() {
    try {
        await checkAndInitializeGitRepo();
        await git.fetch();

        const commits = await git.log(['HEAD..origin/' + config.BRANCH]);

        if (commits.total === 0) {
            return {
                success: true,
                message: '_Bot is already up to date_',
                updated: false
            };
        }

        // Perform git pull
        await new Promise((resolve, reject) => {
            exec(`git pull origin ${config.BRANCH}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });

        return {
            success: true,
            message: '_Successfully updated! Restarting..._',
            updated: true
        };
    } catch (error) {
        console.error('Error during local update:', error);
        return {
            success: false,
            message: '_Update failed: ' + error.message + '_',
            updated: false
        };
    }
}

/**
 * Restart the bot process
 */
function restartBot() {
    setTimeout(() => {
        process.exit(0);
    }, 2000);
}

/**
 * Check and auto-update if AUTO_UPDATE is enabled
 * This is called on bot startup
 */
async function checkAndUpdate() {
    try {
        if (!config.AUTO_UPDATE) {
            console.log('Auto-update is disabled');
            return;
        }

        console.log('Checking for updates...');
        const updateInfo = await checkForUpdates();

        if (!updateInfo.hasUpdates) {
            console.log('Bot is up to date');
            return;
        }

        console.log(`Found ${updateInfo.total} update(s)`);
        console.log('Installing updates...');

        const result = await updateLocal();

        if (result.success && result.updated) {
            console.log('Update successful! Restarting...');
            restartBot();
        }
    } catch (error) {
        console.error('Error in auto-update:', error);
        console.log('Continuing without update...');
    }
}

module.exports = {
    checkForUpdates,
    updateLocal,
    restartBot,
    checkAndInitializeGitRepo,
    checkAndUpdate
};
