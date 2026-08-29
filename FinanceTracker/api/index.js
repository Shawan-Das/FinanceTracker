const appModule = require('../server/dist/app.js');
const app = appModule.default || appModule;

module.exports = app;
