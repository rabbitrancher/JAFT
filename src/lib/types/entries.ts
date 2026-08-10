export type TransactionType = "income" | "expense" | "transfer";

type AccountName = string;

/**
 * Represents a single transaction entry.
 */
export type Entry = {
	id: number;
	date: string;
	amount: number;
	type: TransactionType;
	/**
	 * The account name associated with this transaction, or null if not applicable.
	 */
	account: AccountName | null;
	/**
	 * The destination account name for transfer transactions, or null if not applicable.
	 */
	to_account: AccountName | null;
	/**
	 * The category of the transaction, or null if not specified.
	 */
	category: string | null;
	/**
	 * A brief description of the transaction, or null if not provided.
	 */
	description: string | null;
	/**
	 * Additional notes or comments about the transaction, or null if none.
	 */
	notes: string | null;
};
