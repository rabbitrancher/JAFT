import { db } from "$lib/server/db";
import { categories } from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { asc } from "drizzle-orm";
import { toTitleCase } from "$lib/utils/format";

/**
 * Retrieves all categories, sorted alphabetically.
 */
export const GET: RequestHandler = async () => {
	const sortedCategories = await db.selectDistinct().from(categories).orderBy(asc(categories.name));
	return json(sortedCategories);
};

/**
 * Creates a new category. Names are normalized to Title Case.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { name?: string };

	if (!body.name) {
		return json({ error: "Please provide a valid category name" }, { status: 400 });
	}

	const name = toTitleCase(body.name);

	const result = await db
		.insert(categories)
		.values({ name })
		.onConflictDoNothing({ target: categories.name })
		.returning({ insertedId: categories.id });

	if (result.length === 0) {
		return json({ error: "Category already exists" }, { status: 409 });
	}

	return json({ success: true, id: result[0].insertedId }, { status: 201 });
};
