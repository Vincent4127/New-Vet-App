import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

let _db;

export async function connectDB() {
  console.log('In ConnectDB')
  if (_db) return _db;
  await client.connect();
  _db = client.db(process.env.DB_NAME);
  return _db;
}

export function getDB() {
  if (!_db) throw new Error("DB not initialized. Call connectDB() first.");
  return _db;
}
