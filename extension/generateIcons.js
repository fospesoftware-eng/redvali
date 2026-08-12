const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG header + shield graphics fallback png
// Standard 48x48 valid PNG data uri byte sequence
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABoSURBVGhD7c5BDQAACAIwtH+tS+xggCkgb8ve4z0CBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECbAMFfQH/mP7G6QAAAABJRU5ErkJggg==";

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const buffer = Buffer.from(pngBase64, 'base64');
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), buffer);

console.log('Extension icons created successfully.');
