import { db } from "$lib/server/db";
import { accounts } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import { and, eq, ne } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (body.name === "") {
		return json({ error: "Please provide a valid account name" }, { status: 400 });
	}

	// check if another account already has this name
	if (body.name !== undefined) {
		const existing = await db
			.select()
			.from(accounts)
			.where(and(eq(accounts.name, body.name), ne(accounts.id, body.id)));

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
		.where(eq(accounts.id, body.id))
		.returning({ updatedID: accounts.id });

	if (result.length === 0) {
		return new Response(JSON.stringify({ success: false, error: "Account not found" }), {
			status: 404,
		});
	}

	return json({ success: true });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		name: string;
	};

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
