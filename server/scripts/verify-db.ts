import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackmatrix';
  console.log('--------------------------------------------------');
  console.log('[DB Verify] Testing connection to MongoDB...');
  console.log(`[DB Verify] Target URI: ${uri.replace(/:([^@]+)@/, ':****@')}`);
  console.log('--------------------------------------------------');

  const startTime = Date.now();
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });

    const elapsed = Date.now() - startTime;
    console.log(`\x1b[32m✔ SUCCESS: Connected to MongoDB in ${elapsed}ms!\x1b[0m`);
    console.log(`Database Name: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Port: ${conn.connection.port || 'Default Atlas Srv'}`);

    // List collections
    const collections = await conn.connection.db?.listCollections().toArray();
    console.log(`Collections present: ${collections ? collections.length : 0}`);
    if (collections && collections.length > 0) {
      console.log('Collections list:', collections.map(c => c.name).join(', '));
    } else {
      console.log('Database is currently empty. Run "npm run seed" to populate the full dataset!');
    }

    await mongoose.disconnect();
    console.log('--------------------------------------------------');
    process.exit(0);
  } catch (err: any) {
    console.error(`\x1b[31m✖ CONNECTION FAILED: ${err.message}\x1b[0m`);
    console.log('\nTroubleshooting suggestions:');
    if (uri.includes('mongodb+srv://')) {
      console.log('1. For MongoDB Atlas: Ensure Network Access whitelist has 0.0.0.0/0 (or your current IP) added.');
      console.log('2. Verify the username and password in MONGODB_URI are correct (special characters must be URL-encoded).');
    } else {
      console.log('1. For Local MongoDB: Ensure the MongoDB service is running (e.g. Start -> Services -> MongoDB Server).');
      console.log('2. Or use MongoDB Atlas (Cloud) free cluster by updating MONGODB_URI in server/.env.');
    }
    console.log('--------------------------------------------------');
    process.exit(1);
  }
}

verify();
