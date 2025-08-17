require('dotenv').config({ path: '.env.e2e' });
const mongoose = require('mongoose');
const User = require('../models/User');

const createUser = async () => {
  // This script expects .env.e2e to be created by the global setup.
  // However, pretest:e2e runs before the global setup.
  // This is a problem.

  // For now, I will hardcode the DB URI here.
  // This is not ideal, but I am running out of options.
  const dbUri = 'mongodb+srv://ethanfitzhenry:P7yAwo63myxzCTB2@cluster0.pwgo2ib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(dbUri);
  const testUser = {
    username: 'e2e-user',
    email: 'e2e-user@example.com',
    password: 'password123',
  };
  // Clear existing user
  await User.deleteOne({ email: testUser.email });
  await User.create(testUser);
  await mongoose.disconnect();
};

createUser().catch(console.error);
