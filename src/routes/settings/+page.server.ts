export async function load({ fetch }) {
	const allAccounts = await fetch("/api/accounts").then((r) => r.json());

	return { allAccounts };
}
