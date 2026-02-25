#!/usr/bin/env node

/**
 * Build script for WebSentinel Extension
 * Creates a .zip file ready for Chrome Web Store or Firefox Add-ons submission
 *
 * Usage:
 *   node build.js              # Build for Chrome (default)
 *   node build.js --chrome     # Build for Chrome
 *   node build.js --firefox    # Build for Firefox
 *   node build.js --all        # Build for both
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_NAME = 'WebSentinel';
const BUILD_DIR = 'build';

// Parse CLI arguments
const args = process.argv.slice(2);
const buildAll = args.includes('--all');
const buildFirefox = buildAll || args.includes('--firefox');
const buildChrome = buildAll || args.includes('--chrome') || (!buildFirefox);

// Files and directories to copy (shared between targets)
const filesToCopy = ['LICENSE', 'README.md'];
const dirsToCopy = ['icons', 'src'];

const excludePatterns = [
  /test/,
  /\.git/,
  /\.DS_Store/,
  /TESTING\.md/,
  /scripts/,
  /\.md$/  // Exclude all markdown except README
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldExclude(srcPath)) continue;

    if (entry.isDirectory()) {
      if (entry.name === 'test') continue;
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildTarget(target) {
  const manifestFile = target === 'firefox' ? 'manifest.firefox.json' : 'manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const VERSION = manifest.version;
  const suffix = target === 'firefox' ? '-firefox' : '';
  const ZIP_FILE = `${EXTENSION_NAME}${suffix}-v${VERSION}.zip`;
  const targetBuildDir = path.join(BUILD_DIR, target);

  console.log(`\n--- Building for ${target.charAt(0).toUpperCase() + target.slice(1)} ---`);
  console.log(`  Version: ${VERSION}`);

  // Clean previous build for this target
  if (fs.existsSync(targetBuildDir)) {
    fs.rmSync(targetBuildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetBuildDir, { recursive: true });

  // Copy manifest (always named manifest.json in output)
  fs.copyFileSync(manifestFile, path.join(targetBuildDir, 'manifest.json'));
  console.log(`  + manifest.json (from ${manifestFile})`);

  // Copy shared files
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(targetBuildDir, file));
      console.log(`  + ${file}`);
    }
  });

  // Copy directories
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyDirectory(dir, path.join(targetBuildDir, dir));
      console.log(`  + ${dir}/`);
    }
  });

  // Create zip
  // Remove old zip if it exists
  if (fs.existsSync(ZIP_FILE)) {
    fs.unlinkSync(ZIP_FILE);
  }

  try {
    if (process.platform !== 'win32') {
      execSync(`cd "${targetBuildDir}" && zip -r "../../${ZIP_FILE}" . -x "*.git*" -x "*.DS_Store" > /dev/null`, {
        stdio: 'inherit'
      });
    } else {
      const fullBuildPath = path.resolve(targetBuildDir);
      const zipPath = path.resolve(ZIP_FILE);
      execSync(`powershell -Command "Compress-Archive -Path '${fullBuildPath}\\*' -DestinationPath '${zipPath}' -Force"`, {
        stdio: 'inherit'
      });
    }

    const stats = fs.statSync(ZIP_FILE);
    const fileSizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  -> ${ZIP_FILE} (${fileSizeKB} KB)`);

  } catch (error) {
    console.error(`  ERROR creating zip: ${error.message}`);
    process.exit(1);
  }
}

// Main
console.log(`Building WebSentinel Extension...`);

if (buildChrome) buildTarget('chrome');
if (buildFirefox) buildTarget('firefox');

// Clean up build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

console.log('\nDone!');
