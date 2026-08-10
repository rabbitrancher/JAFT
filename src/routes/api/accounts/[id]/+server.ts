import { db } from "$lib/server/db";
import { accounts, entries } from "$lib/server/db/schema";
import { isAccountType, type AccountType } from "$lib/types/accounts";
import { json, type RequestHandler } from "@sveltejs/kit";
import { or, eq, and, ne } from "drizzle-orm";

/**
 * Updates an existing account.
 *
 * @param {Object} params - The URL parameters containing the account `id`.
 * @param {Object} request - The HTTP request containing the updated account information.
 * @returns {Response} A JSON response indicating whether the update was successful.
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const body = (await request.json()) as {
		name: string;
		type: AccountType;
		archived: boolean;
	};

	if (body.name === "") {
		return json({ error: "Please provide a valid account name" }, { status: 400 });
	}

	if (body.type !== undefined && !isAccountType(body.type)) {
		return json({ error: "Invalid account type" }, { status: 400 });
	}

	// check if another account already has this name
	if (body.name !== undefined) {
		const existing = await db
			.select()
			.from(accounts)
			.where(and(eq(accounts.name, body.name), ne(accounts.id, id)));

		if (existing.length > 0) {
			return new Response(JSON.stringify({ success: false, error: "Name already taken" }), {
				status: 409,
			});
		}
	}

	// update using the provided values
	const result = await db
		.update(accounts)
		.set({
			...(body.name !== undefined && { name: body.name }),
			...(body.type !== undefined && { type: body.type }),
			...(body.archived !== undefined && { archived: body.archived }),
		})
		.where(eq(accounts.id, id))
		.returning();

	if (result.length === 0) {
		return new Response(JSON.stringify({ success: false, error: "Account not found" }), {
			status: 404,
		});
	}

	return json(result[0]);
};

/**
 * Deletes an existing account.
 *
 * @param {Object} params - The URL parameters containing the account `id`.
 * @returns {Response} A JSON response indicating whether the deletion was successful.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const hasInvolvedEntries =
		(
			await db
				.select({ id: entries.id })
				.from(entries)
				.where(or(eq(entries.account_id, id), eq(entries.to_account_id, id)))
				.limit(1)
		).length !== 0;

	if (hasInvolvedEntries) {
		return json(
			{ error: "Cannot delete an account that is tied to existing entries" },
			{ status: 400 },
		);
	}

	await db.delete(accounts).where(eq(accounts.id, id));
	return json({ success: true });
};
