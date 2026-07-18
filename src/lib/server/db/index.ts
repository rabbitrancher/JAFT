import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
	if (_db) return _db;

	const dbPath = process.env.DATABASE_URL ?? "finances.db";
	console.log("Connecting to database at:", dbPath);
	const sqlite = new Database(dbPath);
	console.log("Database connected");

	_db = drizzle(sqlite, { schema });
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		return getDb()[prop as keyof ReturnType<typeof drizzle>];
	},
});
