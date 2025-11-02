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
    const { REPO_URL, BRANCH } = getConfig();
    
    if (!isGitRepo) {
        try {
            console.log('Initializing git repository...');
            await git.init();
            await git.addRemote('origin', REPO_URL);
            await git.fetch();
            
            // Check if we have any commits
            try {
                await git.log();
            } catch {
                // No commits yet, create initial branch tracking
                await git.checkout(['-b', BRANCH]);
                await git.branch(['--set-upstream-to=origin/' + BRANCH, BRANCH]);
            }
        } catch (error) {
            console.error('Error initializing git repository:', error);
            throw new Error('Failed to initialize git repository');
        }
    } else {
        // Ensure remote exists
        try {
            const remotes = await git.getRemotes();
            if (!remotes.find(r => r.name === 'origin')) {
                await git.addRemote('origin', REPO_URL);
            }
        } catch (error) {
            console.error('Error checking remotes:', error);
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
        const { BRANCH } = getConfig();
        
        await git.fetch();
        
        // Check if we have local commits
        let hasLocalCommits = true;
        try {
            await git.log();
        } catch {
            hasLocalCommits = false;
        }
        
        if (!hasLocalCommits) {
            return {
                hasUpdates: true,
                message: '_Repository not initialized. Use .updatenow to clone._',
                commits: [],
                total: 1
            };
        }
        
        // Compare with remote
        const commits = await git.log([`HEAD..origin/${BRANCH}`]);
        
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
        const { BRANCH } = getConfig();
        
        await git.fetch();
        
        // Check if we have local commits
        let hasLocalCommits = true;
        try {
            await git.log();
        } catch {
            hasLocalCommits = false;
        }
        
        if (!hasLocalCommits) {
            // First time setup - pull everything
            await new Promise((resolve, reject) => {
                exec(`git pull origin ${BRANCH}`, (error, stdout) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(stdout);
                    }
                });
            });
            
            return {
                success: true,
                message: '_Successfully initialized from repository!_',
                updated: true
            };
        }
        
        const commits = await git.log([`HEAD..origin/${BRANCH}`]);
        
        if (commits.total === 0) {
            return {
                success: true,
                message: '_Bot is already up to date_',
                updated: false
            };
        }
        
        // Perform git pull
        await new Promise((resolve, reject) => {
            exec(`git pull origin ${BRANCH}`, (error, stdout) => {
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
        const { AUTO_UPDATE } = getConfig();
        
        if (!AUTO_UPDATE) {
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
