import { db } from "$lib/server/db";
import { entries, categories, accounts } from "$lib/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { json, type RequestHandler } from "@sveltejs/kit";
import { toSentenceCase, toTitleCase } from "$lib/utils/format";

const account = alias(accounts, "account");
const toAccount = alias(accounts, "to_account");

/**
 * Retrieves all entries, including their corresponding account/category names,
 * sorted by date in descending order.
 */
export const GET: RequestHandler = async () => {
	const allEntries = await db
		.select({
			id: entries.id,
			date: entries.date,
			amount: entries.amount,
			type: entries.type,
			account: account.name,
			to_account: toAccount.name,
			category: categories.name,
			description: entries.description,
			notes: entries.notes,
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.leftJoin(account, eq(entries.account_id, account.id))
		.leftJoin(toAccount, eq(entries.to_account_id, toAccount.id))
		.orderBy(desc(entries.date));

	return json(allEntries);
};

/**
 * Handles POST requests to create a new entry.
 *
 * Expects a JSON body with the following properties:
 * - date: The date of the entry (string)
 * - amount: The amount of the entry (number)
 * - type: The type of the entry ("income", "expense", or "transfer")
 * - account: The ID of the account the entry belongs to (number)
 * - to_account: The ID of the target account for transfers (number, optional)
 * - category: The name of the category the entry belongs to (string, optional)
 * - description: A brief description of the entry (string, optional)
 * - notes: Additional notes for the entry (string, optional)
 * - allowNewCategories: Whether to create a new category if it doesn't exist (boolean, optional)
 *
 * **NOTE THAT THE /ENTRY PAGE DOES NOT CURRENTLY USE THIS ENDPOINT. IT IS FOR POSSIBLE FUTURE USAGE.**
 *
 * Returns a JSON response with a success message and a 201 status code if the entry is created successfully.
 * Returns a JSON response with an error message and a 400 status code if there are any validation errors.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		date: string;
		amount: number;
		type: "income" | "expense" | "transfer";
		account: number;
		to_account?: number;
		category?: string;
		description?: string;
		notes?: string;
		allowNewCategories?: boolean;
	};

	if (!body.amount || Number(body.amount) < 0) {
		return json({ error: "Please provide a valid, non-negative amount" }, { status: 400 });
	}
	if (body.type !== "income" && body.type !== "expense" && body.type !== "transfer") {
		return json({ error: "Invalid entry type" }, { status: 400 });
	}
	if (!body.date) {
		return json({ error: "Please provide a date" }, { status: 400 });
	}

	const db_account = await db.select().from(accounts).where(eq(accounts.id, body.account)).get();
	if (!db_account) {
		return json({ error: "Unable to find account" }, { status: 400 });
	}

	const description = body.description ? toSentenceCase(String(body.description)) : null;
	const notes = body.notes || null;

	if (body.type === "transfer") {
		if (!body.to_account) {
			return json({ error: "Target account is required for transfers" }, { status: 400 });
		}
		const db_to_account = await db
			.select()
			.from(accounts)
			.where(eq(accounts.id, body.to_account))
			.get();
		if (!db_to_account) {
			return json({ error: "Unable to find target account" }, { status: 400 });
		}

		const transferCategory = await db
			.select()
			.from(categories)
			.where(eq(categories.name, "Transfer"))
			.get();

		await db.insert(entries).values({
			amount: Number(body.amount),
			type: body.type,
			account_id: db_account.id,
			to_account_id: db_to_account.id,
			category_id: transferCategory?.id,
			description,
			notes,
			date: body.date,
		});

		return json({ success: true }, { status: 201 });
	}

	if (!body.category) {
		return json({ error: "Category is required" }, { status: 400 });
	}

	const categoryName = toTitleCase(String(body.category));
	let db_category = await db
		.select()
		.from(categories)
		.where(eq(categories.name, categoryName))
		.get();

	if (!db_category) {
		if (!body.allowNewCategories) {
			return json({ error: "Invalid category" }, { status: 400 });
		}
		const result = await db.insert(categories).values({ name: categoryName }).returning();
		db_category = result[0];
	}

	await db.insert(entries).values({
		amount: Number(body.amount),
		type: body.type,
		account_id: db_account.id,
		category_id: db_category.id,
		description,
		notes,
		date: body.date,
	});

	return json({ success: true }, { status: 201 });
};
