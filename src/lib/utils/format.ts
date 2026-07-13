/**
 * Converts a string to Title Case - e.g. "hello world" -> "Hello World"
 */
export function toTitleCase(str: string): string {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
		.join(" ");
}

/**
 * Converts a string to Sentence case - e.g. "hello world" -> "Hello world"
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
