import type { AccountId, AccountType } from "../accounts";
import type { DataPoint } from "./types";

/**
 * Represents the net worth chart: the combined line across all accounts, plus
 * the same running-balance line computed for each individual account, so the
 * client can switch between "all accounts" and a single account without a
 * refetch.
 */
export interface NetWorthChart {
	points: DataPoint[];
	byAccount: Record<AccountId, DataPoint[]>;
	byAccountType: Record<AccountType, DataPoint[]>;
	byTypePerAccount: Record<AccountType, Record<AccountId, DataPoint[]>>;
}

export interface PopularDescription {
	description: string;
	count: number;
	total: number;
}
