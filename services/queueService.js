const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let connection;
const queues = {};

// Singleton function to get or create the Redis connection
const getConnection = () => {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
};

// Singleton function to get or create a queue instance
const getQueue = (name) => {
  if (!queues[name]) {
    console.log(`Creating new queue: ${name}`);
    queues[name] = new Queue(name, { connection: getConnection() });
  }
  return queues[name];
};

// A function to gracefully close all connections
const closeConnections = async () => {
  for (const queueName in queues) {
    await queues[queueName].close();
    delete queues[queueName];
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
};

module.exports = {
  getQueue,
  getConnection,
  closeConnections,
};
