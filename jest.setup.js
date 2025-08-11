const { MongoMemoryServer } = require('mongodb-memory-server');
const { RedisMemoryServer } = require('redis-memory-server');
const mongoose = require('mongoose');
const { closeConnections } = require('./services/queueService');

let mongoServer;
let redisServer;

beforeAll(async () => {
  // Start MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Start Redis memory server
  redisServer = await RedisMemoryServer.create();
  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  const redisUri = `redis://${host}:${port}`;
  // Set the REDIS_URL for the queue service to use
  process.env.REDIS_URL = redisUri;
});

afterAll(async () => {
  // Close all connections gracefully
  await mongoose.disconnect();
  await closeConnections();
  await mongoServer.stop();
  await redisServer.stop();
});
