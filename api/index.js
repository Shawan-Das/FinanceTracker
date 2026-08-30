/**
 * Vercel Serverless Entry Point
 *
 * Loads the Express app from FinanceTracker/server/dist/app.js.
 * The vercel.json builds config uses includeFiles to bundle the server
 * dist into this function, so all dependencies are available at runtime.
 */
let app;

try {
  const appModule = require('../FinanceTracker/server/dist/app.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app:', error);
  throw error;
}

module.exports = (req, res) => app(req, res);
