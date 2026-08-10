import { db } from "$lib/server/db";
import { categories, entries } from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq, ne, and } from "drizzle-orm";
import { toTitleCase } from "$lib/utils/format";

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const category = await db.select().from(categories).where(eq(categories.id, id)).get();
	if (!category) {
		return json({ error: "Category not found" }, { status: 404 });
	}

	return json(category);
};

/**
 * Renames a category.
 *
 * **IS NOT CURRENTLY USED.**
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const body = (await request.json()) as { name?: string };
	if (!body.name) {
		return json({ error: "Please provide a valid category name" }, { status: 400 });
	}

	const name = toTitleCase(body.name);

	const existing = await db
		.select()
		.from(categories)
		.where(and(eq(categories.name, name), ne(categories.id, id)));

	if (existing.length > 0) {
		return json({ error: "Category already exists" }, { status: 409 });
	}

	const result = await db
		.update(categories)
		.set({ name })
		.where(eq(categories.id, id))
		.returning({ id: categories.id });

	if (result.length === 0) {
		return json({ error: "Category not found" }, { status: 404 });
	}

	return json({ success: true });
};

/**
 * Deletes a category, provided it isn't tied to any existing entries.
 * **IS NOT CURRENTLY USED.**
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const hasInvolvedEntries =
		(await db.select({ id: entries.id }).from(entries).where(eq(entries.category_id, id)).limit(1))
			.length !== 0;

	if (hasInvolvedEntries) {
		return json(
			{ error: "Cannot delete a category that is tied to existing entries" },
			{ status: 400 },
		);
	}

	const result = await db
		.delete(categories)
		.where(eq(categories.id, id))
		.returning({ id: categories.id });

	if (result.length === 0) {
		return json({ error: "Category not found" }, { status: 404 });
	}

	return json({ success: true });
};
