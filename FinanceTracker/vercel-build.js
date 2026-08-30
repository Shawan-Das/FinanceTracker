/**
 * Vercel Build Script
 *
 * 1. Builds TypeScript server
 * 2. Bundles server with external packages (resolved from node_modules at runtime)
 * 3. Builds React client
 * 4. Copies client build to public/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.lstatSync(fp).isDirectory()) rmrf(fp);
    else fs.unlinkSync(fp);
  }
  fs.rmdirSync(dir);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dest, f);
    if (fs.lstatSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 1. Build TypeScript server
console.log('Building server...');
execSync('cd server && npx tsc', { stdio: 'inherit' });

// 2. Bundle server — external packages resolve from node_modules at runtime
console.log('Bundling server...');
const esbuildPath = path.join(__dirname, 'node_modules', '.bin', 'esbuild');
const esbuildBin = fs.existsSync(esbuildPath) ? esbuildPath : 'npx esbuild';
execSync(
  `${esbuildBin} server/dist/app.js --bundle --platform=node --outfile=api/_server.js --packages=external`,
  { stdio: 'inherit' }
);
const size = fs.statSync(path.join(__dirname, 'api', '_server.js')).size;
console.log(`Bundled server to api/_server.js (${Math.round(size/1024)}KB)`);

// 3. Build React client
console.log('Building client...');
execSync('cd client && npm run build', { stdio: 'inherit' });

// 4. Copy client build to public/
const publicDir = path.join(__dirname, 'public');
rmrf(publicDir);
copyDir(path.join(__dirname, 'client', 'dist'), publicDir);
console.log('Copied client/dist/ to public/');

console.log('\nVercel build complete!');
