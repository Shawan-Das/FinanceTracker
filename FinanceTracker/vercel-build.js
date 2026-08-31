/**
 * Vercel Build Script
 *
 * Places outputs in the Vercel Build Output API format:
 * - .vercel/output/static/ → React build (static files)
 * - api/_server.js → Bundled Express server
 * - api/index.js → Function entry point
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

// 2. Bundle server
console.log('Bundling server...');
const esbuildBin = path.join(DIR, 'node_modules', '.bin', 'esbuild');
execSync(
  `"${esbuildBin}" server/dist/app.js --bundle --platform=node --outfile=api/_server.js --external:bcrypt --external:@mapbox/node-pre-gyp --external:pdfkit --external:pg`,
  { cwd: DIR, stdio: 'inherit' }
);
const size = fs.statSync(path.join(DIR, 'api', '_server.js')).size;
console.log(`Bundled server to api/_server.js (${Math.round(size/1024)}KB)`);

// 2b. Copy PDFKit AFM font files and data into api/data for serverless PDF generation
const pdfkitDataSrc = path.join(DIR, 'node_modules', 'pdfkit', 'js', 'data');
const pdfkitDataDest = path.join(DIR, 'api', 'data');
if (fs.existsSync(pdfkitDataSrc)) {
  copyDir(pdfkitDataSrc, pdfkitDataDest);
  console.log('Copied PDFKit AFM font files to api/data/');
}

// 3. Build React client
console.log('Building client...');
execSync('npm run build', { cwd: path.join(DIR, 'client'), stdio: 'inherit' });

// 4. Copy client build to public/ (for outputDirectory)
const publicDir = path.join(DIR, 'public');
rmrf(publicDir);
copyDir(path.join(DIR, 'client', 'dist'), publicDir);
console.log('Copied client to public/');

// 5. Also copy to .vercel/output/static/ (Build Output API)
const staticDir = path.join(DIR, '.vercel', 'output', 'static');
rmrf(path.join(DIR, '.vercel'));
copyDir(path.join(DIR, 'client', 'dist'), staticDir);
console.log('Copied client to .vercel/output/static/');

console.log('\nVercel build complete!');
