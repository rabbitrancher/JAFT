import { eq, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { entries, categories } from '$lib/server/db/schema';
import { CATEGORIES } from '$lib/categories';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const amount = Number(formData.get('amount'));
		const type = String(formData.get('type')) as 'income' | 'expense';
		const notes = String(formData.get('notes') || '');
		const date = String(formData.get('date'));

		// Title case the category input
		const categoryName = String(formData.get('category'))
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.substring(1))
			.join(' ');

		// Sentence case the description input
		const description =
			String(formData.get('description') || '')
				.charAt(0)
				.toUpperCase() +
			String(formData.get('description') || '')
				.slice(1)
				.toLowerCase();

		// Validate category is in the hardcoded list
		const db_category = await db
			.select()
			.from(categories)
			.where(eq(categories.name, categoryName))
			.get();

		if (!db_category) {
			return { success: false, error: 'Invalid category' };
		}

		await db.insert(entries).values({
			amount,
			type,
			category_id: db_category.id,
			description: description || null,
			notes: notes || null,
			date
		});

		return { success: true };
	}
};

export async function load() {
	const pastDescriptions = await db
		.selectDistinct({ description: entries.description })
		.from(entries)
		.where(isNotNull(entries.description));

	return {
		categories: CATEGORIES,
		descriptions: pastDescriptions.map((d) => d.description as string)
	};
}
