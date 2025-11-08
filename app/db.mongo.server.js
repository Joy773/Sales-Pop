import { MongoClient } from 'mongodb';

let client;
let clientPromise;

if (!process.env.DATABASE_URL) {
  console.error('[MongoDB] DATABASE_URL is not set in environment variables');
  throw new Error('Please add your MongoDB connection string to .env');
}

const uri = process.env.DATABASE_URL;
const options = {
  // Add connection options for better error handling
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

if (process.env.NODE_ENV !== 'production') {
  // In development, use a global variable so that the value is preserved across module reloads
  // caused by HMR (Hot Module Replacement)
  if (!global._mongoClientPromise) {
    console.log('[MongoDB] Creating new MongoDB client connection...');
    console.log('[MongoDB] Connection string:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().then((connectedClient) => {
      console.log('[MongoDB] ✓ Successfully connected to MongoDB');
      // Test the connection
      return connectedClient.db('admin').admin().ping().then(() => {
        console.log('[MongoDB] ✓ Connection test successful');
        return connectedClient;
      }).catch((pingError) => {
        console.error('[MongoDB] ✗ Connection test failed:', pingError.message);
        throw pingError;
      });
    }).catch((error) => {
      console.error('[MongoDB] ✗ Failed to connect to MongoDB:', error.message);
      console.error('[MongoDB] Error code:', error.code);
      console.error('[MongoDB] Error name:', error.name);
      if (error.message.includes('authentication')) {
        console.error('[MongoDB] Authentication failed. Check your username and password in DATABASE_URL');
      } else if (error.message.includes('timeout')) {
        console.error('[MongoDB] Connection timeout. Check your network and MongoDB server status.');
      }
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, it's best to not use a global variable
  console.log('[MongoDB] Creating production MongoDB client connection...');
  console.log('[MongoDB] Connection string:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password
  client = new MongoClient(uri, options);
  clientPromise = client.connect().then((connectedClient) => {
    console.log('[MongoDB] ✓ Successfully connected to MongoDB');
    // Test the connection
    return connectedClient.db('admin').admin().ping().then(() => {
      console.log('[MongoDB] ✓ Connection test successful');
      return connectedClient;
    }).catch((pingError) => {
      console.error('[MongoDB] ✗ Connection test failed:', pingError.message);
      throw pingError;
    });
  }).catch((error) => {
    console.error('[MongoDB] ✗ Failed to connect to MongoDB:', error.message);
    console.error('[MongoDB] Error code:', error.code);
    console.error('[MongoDB] Error name:', error.name);
    throw error;
  });
}

export default clientPromise;

