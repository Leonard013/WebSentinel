#!/usr/bin/env node

/**
 * Build script for Page Watch Chrome Extension
 * Creates a .zip file ready for Chrome Web Store submission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_NAME = 'WebSentinel';
const BUILD_DIR = 'build';

// Get version from manifest
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const VERSION = manifest.version;
const ZIP_FILE = `${EXTENSION_NAME}-v${VERSION}.zip`;

console.log(`🚀 Building Page Watch Extension v${VERSION}...`);

// Clean previous build
if (fs.existsSync(BUILD_DIR)) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

// Create build directory
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Files and directories to copy
const filesToCopy = [
  'manifest.json',
  'LICENSE',
  'README.md'
];

const dirsToCopy = [
  'icons',
  'src'
];

// Files and patterns to exclude
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

// Copy files
console.log('📦 Copying files...');

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join(BUILD_DIR, file);
    fs.copyFileSync(file, dest);
    console.log(`  ✓ ${file}`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    copyDirectory(dir, path.join(BUILD_DIR, dir));
    console.log(`  ✓ ${dir}/`);
  }
});

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded files
    if (shouldExclude(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Skip test directories
      if (entry.name === 'test') {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create zip file
console.log('📦 Creating zip file...');

try {
  // Use zip command if available (Unix/Mac)
  if (process.platform !== 'win32') {
    execSync(`cd ${BUILD_DIR} && zip -r ../${ZIP_FILE} . -x "*.git*" -x "*.DS_Store" > /dev/null`, {
      stdio: 'inherit'
    });
  } else {
    // Windows: use PowerShell Compress-Archive
    const buildPath = path.resolve(BUILD_DIR);
    const zipPath = path.resolve(ZIP_FILE);
    execSync(`powershell -Command "Compress-Archive -Path '${buildPath}\\*' -DestinationPath '${zipPath}' -Force"`, {
      stdio: 'inherit'
    });
  }

  // Get file size
  const stats = fs.statSync(ZIP_FILE);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ Build complete!');
  console.log(`📦 Extension package: ${ZIP_FILE}`);
  console.log(`📏 File size: ${fileSizeMB} MB`);
  console.log('');
  console.log('📤 Ready for Chrome Web Store submission!');
  console.log(`   Upload: ${ZIP_FILE}`);

} catch (error) {
  console.error('❌ Error creating zip file:', error.message);
  console.log('');
  console.log('💡 Alternative: Manually zip the build/ directory');
  process.exit(1);
}

// Clean up build directory (optional - comment out to keep for inspection)
// fs.rmSync(BUILD_DIR, { recursive: true, force: true });

