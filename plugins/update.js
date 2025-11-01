const { command } = require("../lib");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const axios = require("axios");

const REPO_URL = "https://github.com/itsdevmj/Axiom-Md";
const REPO_API = "https://api.github.com/repos/itsdevmj/Axiom-Md/commits/main";

// ============ UPDATE COMMAND ============
command({
  pattern: "update",
  type: "system",
  desc: "Check and update bot"
}, async (message, match) => {
  const args = match ? match.trim().toLowerCase() : "";

  try {
    await message.reply("_Checking for updates..._");

    // Get local commit hash
    const { stdout: localHash } = await execAsync("git rev-parse HEAD");
    const localCommit = localHash.trim().substring(0, 7);

    // Fetch latest changes
    await execAsync("git fetch origin main");

    // Get remote commit info
    const { data: remoteData } = await axios.get(REPO_API);
    const remoteCommit = remoteData.sha.substring(0, 7);
    const commitMessage = remoteData.commit.message;
    const commitDate = new Date(remoteData.commit.author.date).toLocaleString();

    if (localCommit === remoteCommit) {
      return await message.reply(`*Bot is up to date*\n\n*Current Version:* ${localCommit}\n*Latest Commit:* ${commitMessage}\n*Date:* ${commitDate}`);
    }

    // Get commits behind
    const { stdout: behindCount } = await execAsync(`git rev-list --count HEAD..origin/main`);
    const behind = behindCount.trim();

    let updateMsg = `*Update Available*\n\n`;
    updateMsg += `*Current Version:* ${localCommit}\n`;
    updateMsg += `*Latest Version:* ${remoteCommit}\n`;
    updateMsg += `*Commits Behind:* ${behind}\n`;
    updateMsg += `*Latest Commit:* ${commitMessage}\n`;
    updateMsg += `*Date:* ${commitDate}\n\n`;

    // If "now" argument is provided, update immediately
    if (args === "now") {
      await message.reply(updateMsg + "\n_Starting update..._");

      // Check if there are local changes
      const { stdout: statusOutput } = await execAsync("git status --porcelain");

      if (statusOutput.trim()) {
        await message.reply("*Local changes detected*\n\nStashing local changes...");
        await execAsync("git stash");
      }

      // Pull updates
      await message.reply("_Pulling updates..._");
      const { stdout: pullOutput } = await execAsync("git pull origin main");

      // Get new commit hash
      const { stdout: newHash } = await execAsync("git rev-parse HEAD");
      const newCommit = newHash.trim().substring(0, 7);

      // Install dependencies if package.json changed
      if (pullOutput.includes("package.json")) {
        await message.reply("_Installing dependencies..._");
        await execAsync("npm install");
      }

      let successMsg = `*Update Successful*\n\n`;
      successMsg += `*Previous Version:* ${localCommit}\n`;
      successMsg += `*Current Version:* ${newCommit}\n\n`;
      successMsg += `_Restarting bot..._`;

      await message.reply(successMsg);

      // Restart bot
      setTimeout(() => {
        process.exit(0);
      }, 2000);

    } else {
      updateMsg += `Use *${global.config.HANDLERS}update now* to install updates`;
      await message.reply(updateMsg);
    }

  } catch (error) {
    console.error("Update error:", error);

    let errorMsg = `*Update Failed*\n\n`;
    errorMsg += `*Error:* ${error.message}\n\n`;

    if (error.message.includes("CONFLICT")) {
      errorMsg += `*Reason:* Merge conflict detected\n`;
      errorMsg += `*Solution:* Contact bot owner to resolve conflicts`;
    } else if (error.message.includes("not a git repository")) {
      errorMsg += `*Reason:* Not a git repository\n`;
      errorMsg += `*Solution:* Clone the bot from ${REPO_URL}`;
    }

    await message.reply(errorMsg);
  }
});
