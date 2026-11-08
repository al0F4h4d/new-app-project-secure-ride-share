import mongoose from 'mongoose';
import { env } from './env.config';
import { logger } from './logger.config';

mongoose.set('strictQuery', true);

// Configure connection options
const mongooseOptions: mongoose.ConnectOptions = {
  maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  autoIndex: env.NODE_ENV !== 'production',
};

// Event listeners for connection lifecycle
mongoose.connection.on('connected', () => {
  logger.info('MongoDB Atlas connected successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error encountered:', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Auto-reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
});

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, mongooseOptions);
    return conn;
  } catch (error) {
    logger.error('Failed to establish MongoDB connection:', { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully.');
  } catch (error) {
    logger.error('Error during MongoDB disconnection:', { error });
    throw error;
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

