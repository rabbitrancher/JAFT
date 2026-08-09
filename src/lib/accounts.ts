export const accountTypes = ["checking", "savings", "cash", "investment", "other"] as const;

export type AccountType = (typeof accountTypes)[number];
