/**
 * Vercel Serverless Entry Point
 *
 * Loads the bundled Express app. The vercel-build script uses esbuild
 * to bundle the entire server into api/server.js (a single file with
 * all dependencies resolved), so no path issues at runtime.
 */
let app;

try {
  const appModule = require('./server.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app:', error);
  throw error;
}

module.exports = (req, res) => app(req, res);
