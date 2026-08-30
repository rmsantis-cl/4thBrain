const net = require("net");

const PORT = 3100;

async function checkPortAvailable() {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\n❌ FATAL: Port ${PORT} is already in use.\n` +
          `This usually means a stray test runner or manual server is still running.\n` +
          `Kill the process bound to port ${PORT} and try again.\n`
        );
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(PORT, "127.0.0.1");
  });
}

module.exports = async () => {
  const available = await checkPortAvailable();
  if (!available) {
    process.exit(1);
  }
};
