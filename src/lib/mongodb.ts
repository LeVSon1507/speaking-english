import { MongoClient, Db, Document } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbNameEnv = process.env.MONGODB_DB as string | undefined;

if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await getMongoClient();
  // If MONGODB_DB is not set, infer from the URI path, else fallback to 'test'
  const inferred = (() => {
    try {
      const url = new URL(uri);
      const dbPath = url.pathname.replace(/^\//, "");
      return dbPath || "test";
    } catch {
      return "test";
    }
  })();
  const name = dbNameEnv || inferred;
  const db = client.db(name);
  cachedDb = db;
  return db;
}

export async function getCollection<T extends Document = Document>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}
