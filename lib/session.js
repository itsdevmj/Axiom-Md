const fs = require('fs');
const { writeFile, mkdir } = require('fs/promises');
const path = require('path');
const axios = require('axios');

module.exports = {
  /**
   * Decode Session from API and Write to File
   * @param {string} session_id The Session ID (e.g., AXIOM_XXXXXXXXXXXX)
   * @param {string} authFolder The folder path where creds.json will be saved
   * Default is "auth_info_baileys"
   * @param {string} baseUrl The base URL of your session API
   * Default is "http://localhost:5000"
   * 
   * @returns {Promise<boolean>} Returns true if successful
   */
  async MakeSession(session_id, authFolder, baseUrl = 'http://localhost:8000') {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch session from API
        const response = await axios.get(`${baseUrl}/session/${session_id}`);

        if (response.status === 200 && response.data) {
          const { creds, createdAt } = response.data;

          if (!creds) {
            reject(new Error('No credentials found in response'));
            return;
          }

          // Decode base64 creds
          const credsJson = Buffer.from(creds, 'base64').toString('utf8');
          const credsData = JSON.parse(credsJson);

          // Create auth folder if it doesn't exist
          const credsPath = path.join(authFolder, 'creds.json');
          const authDir = path.dirname(credsPath);

          if (!fs.existsSync(authDir)) {
            await mkdir(authDir, { recursive: true });
          }

          // Write creds.json
          const data = JSON.stringify(credsData, null, 2);
          await writeFile(credsPath, data);

          console.log(`✓ Session decoded successfully`);
          console.log(`✓ Credential Loaded`);
          resolve(true);
        } else {
          reject(new Error('Failed to fetch session data'));
        }
      } catch (error) {
        if (error.response) {
          console.error(`Error: ${error.response.status} - ${error.response.data.error || error.response.statusText}`);
        } else {
          console.error('Error decoding session:', error.message);
        }
        reject(error);
      }
    });
  },
};
