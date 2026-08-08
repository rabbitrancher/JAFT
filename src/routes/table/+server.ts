import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { entries, categories, accounts } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { toTitleCase, toSentenceCase } from "$lib/utils/format";
import type { RequestHandler } from "./$types";

/**
 * Updates an existing entry in the database.
 * Only fields provided in the request body will be updated (partial update).
 *
 * - Category is validated against the categories table and stored as a foreign key
 * - If allowNewCategories is true, new categories are inserted instead of rejected
 * - Text fields are normalized (title case for category, sentence case for description)
 * - Only known fields are written to the DB to prevent malicious field injection
 *
 * @returns { success: true } on success
 * @returns { error: string } with status 400 on validation failure
 */
export const PATCH: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		id: number;
		allowNewCategories: boolean;
		updates: {
			date?: string;
			amount?: number;
			type?: "income" | "expense" | "transfer";
			account?: string;
			to_account?: string;
			category?: string;
			description?: string;
			notes?: string;
		};
	};

	const { id, updates, allowNewCategories } = body;

	if (!id || typeof id !== "number") {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	// build a safe update object by making sure only explicitly handled fields can make it to the db
	const safeUpdates: Record<string, unknown> = {};

	if (updates.date) {
		safeUpdates.date = String(updates.date);
	}
	if (updates.amount) {
		safeUpdates.amount = Number(updates.amount);
		if (Number(safeUpdates.amount) < 0) {
			return json({ error: "Can't have a negative amount" }, { status: 400 });
		}
	}
	if (updates.type === "income" || updates.type === "expense" || updates.type === "transfer") {
		safeUpdates.type = updates.type;
	}
	if (updates.description) {
		safeUpdates.description = toSentenceCase(String(updates.description));
	}
	if (updates.notes) {
		safeUpdates.notes = String(updates.notes);
	}
	if (updates.account) {
		const account = await db
			.select()
			.from(accounts)
			.where(eq(accounts.name, updates.account))
			.get();

		if (!account) {
			return json({ error: "Invalid account" }, { status: 400 });
		}

		safeUpdates.account_id = account.id;
	}
	if (updates.to_account !== undefined) {
		if (updates.to_account === "") {
			safeUpdates.to_account_id = null;
		} else {
			const account = await db
				.select()
				.from(accounts)
				.where(eq(accounts.name, updates.to_account))
				.get();

			if (!account) {
				return json({ error: "Invalid target account" }, { status: 400 });
			}

			safeUpdates.to_account_id = account.id;
		}
	}
	if (safeUpdates.to_account_id === null && safeUpdates.type === "transfer") {
		return json({ error: "Must provide a target account for a transfer entry" }, { status: 400 });
	}
	if (updates.category) {
		// category is stored as a foreign key, so we need to look up the ID
		// Category names are title case
		const categoryName = toTitleCase(String(updates.category));
		let category = await db
			.select()
			.from(categories)
			.where(eq(categories.name, categoryName))
			.get();

		if (!category) {
			// if it's an unrecognized category and categories are locked, error
			if (!allowNewCategories) {
				return json({ error: "Invalid category" }, { status: 400 });
			}
			// if categories are not locked, insert the new category
			const result = await db.insert(categories).values({ name: categoryName }).returning();
			category = result[0];
		}

		safeUpdates.category_id = category.id;
	}

	await db.update(entries).set(safeUpdates).where(eq(entries.id, id));

	return json({ success: true });
};

/**
 * Deletes an existing entry in the database.
 *
 * @returns { success: true } on success
 * @returns { error: string } with status 400 on validation failure
 */
export const DELETE: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { id: number };
	const { id } = body;
	if (!id || typeof id !== "number") {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	await db.delete(entries).where(eq(entries.id, id));
	return json({ success: true });
};
