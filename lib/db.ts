// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in your .env.local file");
}

// ── Cache the connection across hot-reloads in dev and across requests in prod ──
// We attach it to `global` so Next.js serverless functions share one connection
// instead of opening a new one on every API call.

declare global {
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  // Already connected — return immediately (this is the fast path)
  if (cached.conn) return cached.conn;

  // Connection in progress — wait for it instead of opening a second one
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Keep the pool small for serverless — each instance needs its own sockets
      maxPoolSize: 10,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset so the next request retries
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

// Named alias so both import styles work:
//   import { connectDB } from "@/lib/db"
//   import { connectDB } from "@/lib/dbConnect"
export default connectDB;