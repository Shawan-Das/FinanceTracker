/**
 * Vercel Serverless Entry Point
 *
 * This wraps the Express app so it can run as a Vercel serverless function.
 * All /api/* requests are routed here by vercel.json.
 */
let app;

try {
  // The server is pre-built to server/dist/app.js
  const appModule = require('../FinanceTracker/server/dist/app.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app:', error);
  throw error;
}

module.exports = (req, res) => app(req, res);
