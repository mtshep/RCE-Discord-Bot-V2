const rce_bot = require('./core');
const bot = new rce_bot();

bot.start().then(() => {
  const addCommand = require('./commands/admin/add');
  addCommand.initModalHandler(bot.client);
});

process.on('uncaughtException', (err) => {
  bot.client.functions.log(
    'error',
    `Uncaught Exception:\nMessage: ${err.message}\nStack: ${err.stack}\nError Object: ${JSON.stringify(err, null, 2)}`
  );
});

process.on('unhandledRejection', (reason, promise) => {
  bot.client.functions.log(
    'error',
    `Unhandled Rejection:\nReason: ${reason?.message || reason}\nStack: ${reason?.stack || 'N/A'}\nPromise: ${JSON.stringify(promise, null, 2)}`
  );
});

module.exports = bot;
