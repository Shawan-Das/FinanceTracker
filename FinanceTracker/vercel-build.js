/**
 * Vercel Build Script (cross-platform)
 *
 * 1. Builds the TypeScript server
 * 2. Bundles the server into a single file using esbuild
 * 3. Builds the React client
 * 4. Copies client build to public/
 *
 * All outputs are inside FinanceTracker/ (the Vercel Root Directory).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 1. Build TypeScript server
console.log('Building server...');
execSync('cd server && npx tsc', { stdio: 'inherit' });

// 2. Bundle server into single file for Vercel
console.log('Bundling server for Vercel...');
const esbuildPath = path.join(__dirname, 'node_modules', '.bin', 'esbuild');
const esbuildExists = fs.existsSync(esbuildPath) || fs.existsSync(esbuildPath + '.cmd');
const esbuildBin = esbuildExists ? esbuildPath : 'npx esbuild';
execSync(`${esbuildBin} server/dist/app.js --bundle --platform=node --outfile=api/_server.js --packages=external`, { stdio: 'inherit' });
console.log('Bundled server to api/_server.js');

// 3. Build React client
console.log('Building client...');
execSync('cd client && npm run build', { stdio: 'inherit' });

// 4. Copy client build to public/
const publicDir = path.join(__dirname, 'public');
rmrf(publicDir);
const clientDist = path.join(__dirname, 'client', 'dist');
copyDir(clientDist, publicDir);
console.log('Copied client/dist/ to public/');

console.log('\nVercel build complete!');
