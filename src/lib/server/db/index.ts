import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_URL ?? "finances.db";

console.log("Connecting to database at:", dbPath);

const sqlite = new Database(dbPath);

console.log("Database connected");

export const db = drizzle(sqlite, { schema });
