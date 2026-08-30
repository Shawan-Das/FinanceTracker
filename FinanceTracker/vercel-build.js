/**
 * Vercel Build Script (cross-platform)
 *
 * Copies the client build output to ../public/ for Vercel's static file serving.
 * The server dist stays in FinanceTracker/server/dist/ and is bundled into the
 * serverless function via the includeFiles config in vercel.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.lstatSync(fp).isDirectory()) {
      rmrf(fp);
    } else {
      fs.unlinkSync(fp);
    }
  }
  fs.rmdirSync(dir);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const srcPath = path.join(src, f);
    const destPath = path.join(dest, f);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean and recreate public/
const publicDir = path.join(ROOT, 'public');
rmrf(publicDir);

// Copy client build to public/
const clientDist = path.join(__dirname, 'client', 'dist');
copyDir(clientDist, publicDir);
console.log('✓ Copied client/dist/ → public/');

console.log('\nBuild output ready for Vercel.');
