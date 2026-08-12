const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const extDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const zipFile = path.join(distDir, 'red-valley-chrome-extension-v1.0.0.zip');

console.log('📦 Building Production Bundle for Red Valley Chrome Extension...\n');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  // Zip extension directory contents into dist
  execSync(`cd "${extDir}" && zip -r "${zipFile}" manifest.json background/ content/ popup/ icons/`, { stdio: 'inherit' });
  console.log(`\n✅ Production extension bundle created successfully!`);
  console.log(`📁 Bundle Path: ${zipFile}`);
} catch (err) {
  console.error('❌ Zip packaging failed:', err.message);
  process.exit(1);
}
