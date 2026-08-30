const http = require("http");

const PORT = 3100;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

async function isServerReady(attempt = 0) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/chat`, (res) => {
      resolve(true);
    });

    req.on("error", (err) => {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => {
          resolve(isServerReady(attempt + 1));
        }, RETRY_DELAY);
      } else {
        console.error(
          `\n❌ FATAL: Could not connect to server on port ${PORT} after ${MAX_RETRIES} retries.\n` +
          `The webServer may not have started properly.\n`
        );
        resolve(false);
      }
    });

    req.setTimeout(2000);
  });
}

module.exports = async () => {
  const ready = await isServerReady();
  if (!ready) {
    process.exit(1);
  }
};
