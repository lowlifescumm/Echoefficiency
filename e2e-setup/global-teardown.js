module.exports = async () => {
  if (global.__REDIS_SERVER__) {
    await global.__REDIS_SERVER__.stop();
  }
};
