/**
 * Vercel Serverless Entry Point
 *
 * The vercel-build script copies server/dist/* into api/dist/ so that
 * all required files are colocated. Vercel's nft bundler can then trace
 * and include everything the function needs.
 */
let app;

try {
  const appModule = require('./dist/app.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app:', error);
  throw error;
}

module.exports = (req, res) => app(req, res);
