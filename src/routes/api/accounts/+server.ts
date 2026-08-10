import { db } from "$lib/server/db";
import { accounts } from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

/**
 * Handles GET requests to retrieve a list of accounts.
 *
 * @param {Request} request - The incoming request object.
 *
 * @returns {Response} A JSON response containing a list of accounts.
 *
 * @throws {Response} No defined errors, but may throw internal server errors.
 */
export const GET: RequestHandler = async ({ url }) => {
	const archivedParam = url.searchParams.get("archived");

	const allAccounts =
		archivedParam === null
			? await db.select().from(accounts)
			: await db
					.select()
					.from(accounts)
					.where(eq(accounts.archived, archivedParam === "true"));

	return json(allAccounts);
};

/**
 * Handles the creation of a new account via a POST request.
 *
 * @param {Request} request - The incoming request object.
 *
 * @returns {Response} A JSON response indicating whether the account creation was successful.
 *
 * @throws {Response} A 400 error response if the request body is missing the required 'name' field.
 * @throws {Response} A 409 error response if the account name already exists.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		name: string;
	};

	if (!body.name) {
		return json({ error: "Please provide a valid account name" }, { status: 400 });
	}

	// returns the inserted account entry if one was created
	const result = await db
		.insert(accounts)
		.values({ name: body.name })
		.onConflictDoNothing({ target: accounts.name })
		.returning({ insertedId: accounts.id });

	if (result.length === 0) {
		// if nothing was returned, nothing was inserted (the name already existed), meaning there was an error
		return new Response(JSON.stringify({ success: false, error: "Name already taken" }), {
			status: 409,
		});
	}
	return json({ success: true });
};
