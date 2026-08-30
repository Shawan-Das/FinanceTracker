/**
 * Vercel Build Script
 *
 * 1. Builds TypeScript server
 * 2. Bundles server with esbuild — only native packages are external
 * 3. Builds React client
 * 4. Copies client build to public/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIR = __dirname;

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
execSync('npx tsc', { cwd: path.join(DIR, 'server'), stdio: 'inherit' });

// 2. Bundle server — bundle EVERYTHING except native C++ addons
//    bcrypt uses node-pre-gyp which has native bindings that esbuild can't handle
console.log('Bundling server...');
const esbuildBin = path.join(DIR, 'node_modules', '.bin', 'esbuild');
execSync(
  `"${esbuildBin}" server/dist/app.js --bundle --platform=node --outfile=api/_server.js --external:bcrypt --external:@mapbox/node-pre-gyp`,
  { cwd: DIR, stdio: 'inherit' }
);
const size = fs.statSync(path.join(DIR, 'api', '_server.js')).size;
console.log(`Bundled server to api/_server.js (${Math.round(size/1024)}KB)`);

// 3. Build React client
console.log('Building client...');
execSync('npm run build', { cwd: path.join(DIR, 'client'), stdio: 'inherit' });

// 4. Copy client build to public/
const publicDir = path.join(DIR, 'public');
rmrf(publicDir);
copyDir(path.join(DIR, 'client', 'dist'), publicDir);
console.log('Copied client to public/');

console.log('\nVercel build complete!');
