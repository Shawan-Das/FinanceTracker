/**
 * Vercel Serverless Entry Point
 *
 * Loads the bundled Express app from _server.js (same directory).
 * The vercel-build script uses esbuild to bundle the entire server
 * into this single file so no cross-directory path resolution issues.
 */
let app;

try {
  const appModule = require('./_server.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app:', error);
  throw error;
}

module.exports = (req, res) => app(req, res);
