import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");

/**
 * Neon's HTTP driver in production. Plain TCP Postgres (node-postgres) when pointing at a local
 * database, so development works against the docker container without a Neon proxy.
 * Both drivers expose the same Drizzle query builder.
 */
function create(): Database {
  const isNeon = /neon\.tech|neon\.build/.test(url!);
  if (isNeon) return drizzleNeon({ client: neon(url!), schema, casing: "snake_case" });
  return drizzlePg({ connection: url!, schema, casing: "snake_case" }) as unknown as Database;
}

const globalForDb = globalThis as unknown as { __recodeDb?: Database };
export const db = globalForDb.__recodeDb ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.__recodeDb = db;

export { schema };
