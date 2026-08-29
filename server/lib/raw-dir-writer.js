const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");

function writeFile({ buffer, originalName }, cfg) {
  const ext = path.extname(originalName) || "";
  const destName = `${crypto.randomUUID()}${ext}`;
  const destPath = path.join(cfg.rawDirInbox, destName);
  fs.writeFileSync(destPath, buffer);
  return {
    path: destPath,
    mimeType: mime.lookup(originalName) || null,
    charset: "utf-8",
  };
}

function writeText({ text }, cfg) {
  const destName = `${crypto.randomUUID()}.txt`;
  const destPath = path.join(cfg.rawDirInbox, destName);
  fs.writeFileSync(destPath, text, "utf-8");
  return {
    path: destPath,
    mimeType: "text/plain",
    charset: "utf-8",
  };
}

function writeUrl({ url }, cfg) {
  const destName = `${crypto.randomUUID()}.txt`;
  const destPath = path.join(cfg.rawDirClipping, destName);
  fs.writeFileSync(destPath, url, "utf-8");
  return {
    path: destPath,
    mimeType: null,
    charset: null,
  };
}

module.exports = { writeFile, writeText, writeUrl };
