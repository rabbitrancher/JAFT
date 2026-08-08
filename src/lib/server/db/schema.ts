import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
});

export const accounts = sqliteTable("accounts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
	type: text("type", {
		enum: ["checking", "savings", "cash", "investment", "other"],
	})
		.notNull()
		.default("checking"),
	startingBalance: real("starting_balance").notNull().default(0),
});

export const entries = sqliteTable("entries", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	amount: real("amount").notNull(),
	type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
	category_id: integer("category_id").references(() => categories.id),
	account_id: integer("account_id")
		.notNull()
		.references(() => accounts.id),
	to_account_id: integer("to_account_id").references(() => accounts.id),
	description: text("description"),
	notes: text("notes"),
	date: text("date").notNull().default(new Date().toISOString().split("T")[0]),
	created_at: text("created_at").notNull().default(new Date().toISOString()),
});
