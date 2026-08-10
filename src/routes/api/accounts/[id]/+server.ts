/**
 * This module provides API endpoints for updating and deleting accounts.
 *
 * The PATCH endpoint updates an existing account with new information,
 * while the DELETE endpoint removes an account from the database.
 *
 * Both endpoints take an `id` parameter, which specifies the account to be updated or deleted.
 *
 * The PATCH endpoint also takes a JSON body with the updated account information,
 * including `name`, `type`, and `archived` fields.
 *
 * The DELETE endpoint checks if the account to be deleted is involved in any existing entries,
 * and returns an error if it is. Otherwise, it deletes the account from the database.
 *
 * @module accounts
 */

import { isAccountType, type AccountType } from "$lib/accounts";
import { db } from "$lib/server/db";
import { accounts, entries } from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { or, eq, and, ne } from "drizzle-orm";

/**
 * Updates an existing account with new information.
 *
 * @param {Object} params - The URL parameters, including the `id` of the account to be updated.
 * @param {Object} request - The HTTP request object, which contains the updated account information in its JSON body.
 *
 * @returns {Response} A JSON response with a success message or an error message if the update fails.
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
		.returning({ updatedID: accounts.id });

	if (result.length === 0) {
		return new Response(JSON.stringify({ success: false, error: "Account not found" }), {
			status: 404,
		});
	}

	return json({ success: true });
};

/**
 * Deletes an existing account from the database.
 *
 * @param {Object} params - The URL parameters, including the `id` of the account to be deleted.
 *
 * @returns {Response} A JSON response with a success message or an error message if the deletion fails.
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
