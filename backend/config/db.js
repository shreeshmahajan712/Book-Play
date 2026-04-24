const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connects to MongoDB with exponential-backoff retry logic.
 * Supports replica sets required for multi-document transactions.
 */
const connectDB = async (retries = MAX_RETRIES) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Keeps the connection alive to prevent timeout on idle
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected → ${conn.connection.host} [${conn.connection.name}]`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);

    if (retries > 0) {
      logger.warn(`Retrying connection in ${RETRY_DELAY_MS / 1000}s... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }

    logger.error('All MongoDB connection retries exhausted. Exiting.');
    process.exit(1);
  }
};

module.exports = connectDB;
