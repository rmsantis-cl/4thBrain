const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const AdmZip = require("adm-zip");
const tar = require("tar");

const execFileAsync = promisify(execFile);

async function extractArchive(filePath, ext, targetDir) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archive file not found: ${filePath}`);
  }

  if (ext === ".zip") {
    return extractZip(filePath, targetDir);
  } else if (ext === ".tar") {
    return extractTar(filePath, targetDir);
  } else if (ext === ".Z") {
    return extractCompressed(filePath, targetDir);
  } else {
    throw new Error(`Unsupported archive format: ${ext}`);
  }
}

function extractZip(filePath, targetDir) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  const extracted = [];

  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) continue;

    // Zip-slip validation: ensure resolved path stays under targetDir
    const resolvedPath = path.resolve(targetDir, entry.entryName);
    const targetDirResolved = path.resolve(targetDir);
    if (!resolvedPath.startsWith(targetDirResolved + path.sep) &&
        resolvedPath !== targetDirResolved) {
      // Potential zip-slip attempt
      continue;
    }

    // Extract the file
    zip.extractEntryTo(entry, targetDir, false, true);
    extracted.push({
      relativePath: entry.entryName,
      absolutePath: resolvedPath,
      sizeBytes: entry.header.size,
    });
  }

  return extracted;
}

async function extractTar(filePath, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  await tar.extract({
    file: filePath,
    cwd: targetDir,
    preservePaths: false, // Strip absolute paths
  });

  // Walk the directory to get extracted files
  const extracted = walkDirectory(targetDir, targetDir);
  return extracted;
}

async function extractCompressed(filePath, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    // Try to find and use the system uncompress binary
    const outputFileName = path.basename(filePath).replace(/\.Z$/, "");
    const outputPath = path.join(targetDir, outputFileName);

    await execFileAsync("uncompress", ["-c", filePath], {
      encoding: "binary",
      stdio: ["pipe", "pipe", "pipe"],
    }).then(({ stdout }) => {
      fs.writeFileSync(outputPath, stdout, "binary");
    });

    return [{
      relativePath: outputFileName,
      absolutePath: outputPath,
      sizeBytes: fs.statSync(outputPath).size,
    }];
  } catch (err) {
    throw new Error(`Unable to extract .Z file (uncompress not available or failed): ${err.message}`);
  }
}

function walkDirectory(dir, baseDir) {
  const results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results.push(...walkDirectory(filePath, baseDir));
    } else {
      results.push({
        relativePath: path.relative(baseDir, filePath),
        absolutePath: filePath,
        sizeBytes: stat.size,
      });
    }
  }

  return results;
}

module.exports = { extractArchive };
