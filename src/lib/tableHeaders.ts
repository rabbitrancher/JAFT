import { toTitleCase } from "./utils/format";

/**
 * An array of all possible column keys in the table.
 * This array should be kept in sync with the schema.
 */
export const COLUMN_KEYS = ["date", "amount", "type", "category", "description", "notes"] as const;

/**
 * A type representing a single column key in the table.
 * It is a union of all possible keys in COLUMN_KEYS.
 */
export type ValidColumnKey = (typeof COLUMN_KEYS)[number];

/**
 * Represents a single table column header
 * */
export type Header = {
	/**
	 * Used internally to access the entry object property
	 */
	key: ValidColumnKey;
	/**
	 * Displayed to the user
	 */
	label: string;
};

/**
 * Converts a snake_case or lowercase key into a Title Case display label.
 * @example "category_id" -> "Category Id"
 */
function formatLabel(key: string): string {
	return toTitleCase(key.replaceAll("_", " "));
}

/**
 * All possible table headers
 */
export const ALL_HEADERS: Header[] = COLUMN_KEYS.map((key) => ({
	key,
	label: formatLabel(key),
}));

/**
 * The default column keys shown in the table before the user customizes their view in settings.
 */
const DEFAULT_KEYS: ValidColumnKey[] = ["date", "category", "amount", "description"];

/**
 * The headers shown by default before the user customizes their view in settings
 */
export const DEFAULT_HEADERS: Header[] = DEFAULT_KEYS.map((key) => ({
	key,
	label: formatLabel(key),
}));

/**
 * Represents a table header and its potential to be selected in the settings menu or not
 */
export type HeaderOption = {
	/**
	 * The actual header object
	 */
	header: Header;
	/**
	 * Whether or not this header's visibility was toggled on or off in the settings menu
	 */
	selected: boolean;
};

/**
 * The default headers selected in the settings before the user customizes them
 */
export const DEFAULT_SELECTED_HEADERS: HeaderOption[] = ALL_HEADERS.map((header) => ({
	header,
	selected: DEFAULT_HEADERS.some((h) => h.key === header.key),
}));
