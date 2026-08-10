export const accountTypes = ["checking", "savings", "cash", "investment", "other"] as const;

export type AccountType = (typeof accountTypes)[number];

export type AccountName = string;

export type AccountId = number;

export function isAccountType(value: unknown): value is AccountType {
	return typeof value === "string" && accountTypes.includes(value as AccountType);
}
