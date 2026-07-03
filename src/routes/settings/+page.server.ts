import { ALL_HEADERS } from "$lib/tableHeaders";

export async function load() {
	return { allHeaders: ALL_HEADERS };
}
