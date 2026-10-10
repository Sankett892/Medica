import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  const uri = customUri || config.MONGODB_URI;
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: !config.isProduction,
      serverSelectionTimeoutMS: 5000
    });
    if (!config.isTest) {
      console.log(`[DB] Connected to MongoDB (${conn.connection.name})`);
    }
    return conn;
  } catch (error) {
    if (!config.isProduction) {
      console.warn(`[DB] Could not connect to MongoDB at ${uri}.`);
      console.warn(`[DB] Activating resilient in-memory database with pre-seeded synthetic data...`);
      const { setupInMemoryDB } = await import('./memoryDb.js');
      await setupInMemoryDB();
      console.log(`[DB] In-memory database active and ready for live portal requests!`);
      return mongoose;
    }
    console.error('[DB] Connection error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
