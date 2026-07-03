import { toTitleCase } from "./utils/format";

/**
 * Represents a single table column header
 * */
export type Header = {
	/**
	 * Used internally to access the entry object property
	 */
	key: string;
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
 *
 * MAKE SURE TO add new columns here when the schema changes
 */
export const ALL_HEADERS: Header[] = [
	"date",
	"amount",
	"type",
	"category",
	"description",
	"notes",
].map((key) => ({ key, label: formatLabel(key) }));

/**
 * The headers shown by default before the user customizes their view in settings
 */
export const DEFAULT_HEADERS: Header[] = [
	"date",
	"category",
	"amount",
	"description",
].map((key) => ({ key, label: formatLabel(key) }));

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
export const DEFAULT_SELECTED_HEADERS: HeaderOption[] = ALL_HEADERS.map(
	(header) => ({
		header,
		selected: DEFAULT_HEADERS.some((h) => h.key === header.key),
	}),
);
