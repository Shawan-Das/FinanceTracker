let app;

try {
  const appModule = require('../server/dist/app.js');
  app = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load the Express app for Vercel:', error);
  throw error;
}

module.exports = (req, res, next) => app(req, res, next);
