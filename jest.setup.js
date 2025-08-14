const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RedisMemoryServer } = require('redis-memory-server');
const mongoose = require('mongoose');
const { closeConnections } = require('./services/queueService');

let mongoServer;
let redisServer;

global.mongoServer;
global.redisServer;

beforeAll(async () => {
    if (MongoMemoryServer) {
        // Start MongoDB memory server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        global.mongoUri = mongoUri; // Make URI available to isolated tests
    }

    if (RedisMemoryServer) {
        // Start Redis memory server
        redisServer = await RedisMemoryServer.create();
        const host = await redisServer.getHost();
        const port = await redisServer.getPort();
        const redisUri = `redis://${host}:${port}`;
        // Set the REDIS_URL for the queue service to use
        process.env.REDIS_URL = redisUri;
    }


  // Set dummy credentials for services that check for them
  process.env.TWILIO_ACCOUNT_SID = 'AC_dummy_sid';
  process.env.TWILIO_AUTH_TOKEN = 'dummy_auth_token';
});

afterAll(async () => {
    // Close all connections gracefully
    if (mongoose.disconnect) {
        await mongoose.disconnect();
    }
    if (closeConnections) {
        await closeConnections();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
    if (redisServer) {
        await redisServer.stop();
    }
});
