import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
});

export const entries = sqliteTable("entries", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	amount: real("amount").notNull(),
	type: text("type", { enum: ["income", "expense"] }).notNull(),
	category_id: integer("category_id").references(() => categories.id),
	description: text("description"),
	notes: text("notes"),
	date: text("date").notNull().default(new Date().toISOString().split("T")[0]),
	created_at: text("created_at").notNull().default(new Date().toISOString()),
});
