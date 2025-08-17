const { RedisMemoryServer } = require('redis-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const redisServer = await RedisMemoryServer.create();
  const redisUri = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;
  global.__REDIS_SERVER__ = redisServer;

  const envContent = `
DATABASE_URL=mongodb+srv://ethanfitzhenry:P7yAwo63myxzCTB2@cluster0.pwgo2ib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
REDIS_URL=${redisUri}
SESSION_SECRET=e2e-test-session-secret
STRIPE_PUBLIC_KEY=pk_test_dummy
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_PRICE_ID=price_dummy
`;
  fs.writeFileSync(path.join(__dirname, '..', '.env.e2e'), envContent);
};
