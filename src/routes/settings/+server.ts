import { db } from "$lib/server/db";
import { accounts } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();

	// set either the name of an account or it's archived status depending on the contents of the body
	await db
		.update(accounts)
		.set({
			...(body.name !== undefined && { name: body.name }),
			...(body.archived !== undefined && { archived: body.archived }),
		})
		.where(eq(accounts.id, body.id));

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
