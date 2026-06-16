import { db } from './index';
import { categories } from './schema';
import { CATEGORIES } from '$lib/categories';

await db.insert(categories).values(
	CATEGORIES.map((name) => ({ name }))
).onConflictDoNothing();

console.log('Seeded categories successfully');
