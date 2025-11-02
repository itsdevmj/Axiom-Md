const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');

async function checkAndUpdate() {
    try {
        // Skip if auto-update is disabled
        if (process.env.AUTO_UPDATE === 'false') {
            console.log('Auto-update disabled');
            return false;
        }

        console.log('Checking for updates...');

        // Get repo info from config or environment
        const GITHUB_REPO = process.env.GITHUB_REPO || 'itsdevmj/Axiom-Md';
        const BRANCH = global.config?.BRANCH || process.env.BRANCH || 'main';

        // Get current commit from local .git if exists
        let currentCommit = null;
        try {
            currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            console.log('Could not get current commit, skipping update check');
            return false;
        }

        // Check GitHub API for latest commit
        const commitUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits/${BRANCH}`;
        const { data: commitData } = await axios.get(commitUrl);
        const latestCommit = commitData.sha;

        if (currentCommit === latestCommit) {
            console.log('Bot is up to date!');
            return false;
        }

        console.log('New updates found!');
        console.log(`Current: ${currentCommit.substring(0, 7)}`);
        console.log(`Latest:  ${latestCommit.substring(0, 7)}`);
        console.log(`Update: ${commitData.commit.message.split('\n')[0]}`);

        // Check if filesystem is writable
        try {
            fs.accessSync('.', fs.constants.W_OK);
        } catch (error) {
            console.log('Filesystem is read-only, cannot auto-update');
            console.log('Please redeploy from your cloud platform dashboard');
            return false;
        }

        // Pull latest changes
        console.log('Pulling latest changes...');
        try {
            execSync(`git pull origin ${BRANCH}`, { stdio: 'inherit' });
            console.log('Successfully pulled latest changes');
        } catch (error) {
            console.error('Failed to pull changes:', error.message);
            return false;
        }

        // Check if package.json changed and update dependencies
        try {
            const diff = execSync('git diff HEAD@{1} HEAD -- package.json', { encoding: 'utf8' });
            if (diff) {
                console.log('Dependencies changed, updating...');
                execSync('npm install --production', {
                    stdio: 'inherit',
                    timeout: 120000
                });
                console.log('Dependencies updated');
            }
        } catch (error) {
            // Ignore if git diff fails
        }

        console.log('Update completed! Restarting...');

        // Restart the process
        setTimeout(() => {
            process.exit(0);
        }, 1000);

        return true;
    } catch (error) {
        console.error('Update check failed:', error.message);
        console.log('Continuing with current version...');
        return false;
    }
}

module.exports = { checkAndUpdate };
