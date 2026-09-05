const fs = require("fs");

function looksBinary(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const sampleSize = 2 * 4096; // 2 blocks of 4096 bytes
    const buffer = Buffer.alloc(sampleSize);
    const bytesRead = fs.readSync(fd, buffer, 0, sampleSize);
    fs.closeSync(fd);

    const sample = buffer.slice(0, bytesRead);

    // Check for NUL byte
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        return {
          isBinary: true,
          reason: `NUL byte at offset ${i}`,
        };
      }
    }

    // Check for high ratio of non-printable control bytes
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Control characters: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
      if ((byte >= 0x00 && byte <= 0x08) ||
          (byte >= 0x0B && byte <= 0x0C) ||
          (byte >= 0x0E && byte <= 0x1F) ||
          byte === 0x7F) {
        nonPrintable++;
      }
    }

    const ratio = nonPrintable / sample.length;
    if (ratio > 0.3) {
      return {
        isBinary: true,
        reason: `${(ratio * 100).toFixed(1)}% non-printable control bytes`,
      };
    }

    return { isBinary: false, reason: null };
  } catch (err) {
    return { isBinary: false, reason: `sniff check error: ${err.message}` };
  }
}

module.exports = { looksBinary };
