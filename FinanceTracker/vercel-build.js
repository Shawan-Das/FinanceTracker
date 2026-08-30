/**
 * Vercel Build Script (cross-platform)
 *
 * 1. Builds the TypeScript server
 * 2. Bundles the server into a single file using esbuild (so no path issues)
 * 3. Builds the React client
 * 4. Copies client build to ../public/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 1. Build TypeScript server
console.log('🔨 Building server...');
execSync('cd server && npx tsc', { stdio: 'inherit' });

// 2. Bundle server into single file for Vercel
console.log('📦 Bundling server for Vercel...');
const esbuildPath = path.join(__dirname, 'node_modules', '.bin', 'esbuild');
const esbuildExists = fs.existsSync(esbuildPath) || fs.existsSync(esbuildPath + '.cmd');
if (esbuildExists) {
  execSync(`${esbuildPath} server/dist/app.js --bundle --platform=node --outfile=../api/_server.js --packages=external`, { stdio: 'inherit' });
} else {
  // Fallback: use npx
  execSync(`npx esbuild server/dist/app.js --bundle --platform=node --outfile=../api/_server.js --packages=external`, { stdio: 'inherit' });
}
console.log('✓ Bundled server → api/_server.js');

// 3. Build React client
console.log('🔨 Building client...');
execSync('cd client && npm run build', { stdio: 'inherit' });

// 4. Copy client build to public/
const publicDir = path.join(ROOT, 'public');
rmrf(publicDir);
const clientDist = path.join(__dirname, 'client', 'dist');
copyDir(clientDist, publicDir);
console.log('✓ Copied client/dist/ → public/');

console.log('\n✅ Vercel build complete!');
