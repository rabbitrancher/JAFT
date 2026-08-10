import { db } from "$lib/server/db";
import { accounts } from "$lib/server/db/schema";

export async function load() {
	const allAccounts = await db.select().from(accounts);

	return { allAccounts };
}
