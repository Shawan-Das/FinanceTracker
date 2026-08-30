/**
 * Vercel Build Script (cross-platform)
 *
 * Copies the server build output to ../api/dist/ and the client build output
 * to ../public/ so Vercel can deploy them correctly.
 *
 * This script runs from FinanceTracker/ directory (where package.json is).
 * api/ and public/ are at the project root (one level up).
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

// Clean and recreate output directories
const publicDir = path.join(ROOT, 'public');
const apiDistDir = path.join(ROOT, 'api', 'dist');

rmrf(publicDir);
rmrf(apiDistDir);

// Copy client build to public/
const clientDist = path.join(__dirname, 'client', 'dist');
copyDir(clientDist, publicDir);
console.log('✓ Copied client/dist/ → public/');

// Copy server build to api/dist/
const serverDist = path.join(__dirname, 'server', 'dist');
copyDir(serverDist, apiDistDir);
console.log('✓ Copied server/dist/ → api/dist/');

console.log('\nBuild output ready for Vercel.');
