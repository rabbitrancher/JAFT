/**
 * Converts a string to Title Case, e.g. "hello world" -> "Hello World"
 */
export function toTitleCase(str: string): string {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
		.join(" ");
}

/**
 * Converts a string to Sentence case, e.g. "hello world" -> "Hello world"
 */
export function toSentenceCase(str: string): string {
	const lower = str.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Formats a number as USD currency
 */
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

/**
 * Formats a "YYYY-MM" key as a short human-readable month, e.g. "2026-06" -> "Jun 2026"
 */
export function formatMonthLabel(monthKey: string): string {
	const [year, month] = monthKey.split("-");
	return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}
