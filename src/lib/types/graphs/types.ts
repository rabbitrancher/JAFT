import type { AccountId, AccountType } from "$lib/types/accounts";
import type { TransactionType } from "../entries";

/**
 * Represents a point on a chart with a date string x-axis and a numeric y-axis.
 */
export interface DataPoint {
	/**
	 * The date string represented by this data point.
	 */
	date: DateString;
	/**
	 * The numeric value of this data point.
	 */
	amount: Balance;
}

/**
 * Represents a range of time that can be used to filter data.
 */
export type TimeRange = "all" | "month" | "year";

export type DateString = string;

export type Balance = number;

export type BalanceChange = number;

export type DailyBalanceChanges = Record<DateString, BalanceChange>;

/**
 * Represents the type of a cash flow, either an income or an expense. Transfers are not included, since those do not add / take away money from the total value of all accounts.
 */
export type CashFlowType = Exclude<TransactionType, "transfer">;
/**
 * Represents a point on the category chart with a date string x-axis, a numeric
 * y-axis, and a category label.
 */
export interface CategoryPoint {
	/**
	 * The date string represented by this data point.
	 */
	x: string;
	/**
	 * The numeric value of this data point.
	 */
	y: Balance;
	/**
	 * The category label associated with this data point.
	 */
	category: string;
	/**
	 * The type of transaction, either an income or an expense.
	 */
	cashFlowType: CashFlowType;
	/**
	 * The account this entry belongs to, so the client can filter to a single
	 * account.
	 */
	accountId: AccountId;
	/**
	 * The account type this entry belongs to, so the client can filter to a single
	 * account type.
	 */
	accountType: AccountType;
}

/**
 * Represents income or expense totals across three windows: all time, this
 * calendar year, and this calendar month.
 */
export interface MoneyMovement {
	total: number;
	thisYear: number;
	thisMonth: number;
}

/**
 * Represents a summary of the current financial state, including net worth and
 * income/expense totals.
 */
export interface FinancialSummary {
	/**
	 * The current net worth.
	 */
	currentNetWorth: number;
	/**
	 * The total income, including all time, yearly, and monthly totals.
	 */
	incomes: MoneyMovement;
	/**
	 * The total expenses, including all time, yearly, and monthly totals.
	 */
	expenses: MoneyMovement;
	/**
	 * The total income for each account, including all time, yearly, and
	 * monthly totals.
	 */
	incomesByAccount: Record<AccountId, MoneyMovement>;
	/**
	 * The total income for each account type, including all time, yearly, and
	 * monthly totals.
	 */
	incomesByAccountType: Record<AccountType, MoneyMovement>;
	/**
	 * The total expenses for each account, including all time, yearly, and
	 * monthly totals.
	 */
	expensesByAccount: Record<AccountId, MoneyMovement>;
	/**
	 * The total expenses for each account type, including all time, yearly, and
	 * monthly totals.
	 */
	expensesByAccountType: Record<AccountType, MoneyMovement>;
}

/**
 * Represents a trend point with a month, total, and moving average.
 */
export interface TrendPoint {
	/**
	 * The month associated with this trend point, in the format "YYYY-MM".
	 */
	month: string;
	/**
	 * The total value for this trend point.
	 */
	total: Balance;
	/**
	 * The moving average for this trend point, or null if not available.
	 */
	movingAverage: Balance | null;
}

/**
 * Represents a summary of spending trends.
 */
export interface TrendSummary {
	currentMonth: number;
	previousMonth: number;
	percentChangeVsLastMonth: number | null;
	threeMonthAverage: number | null;
	percentChangeVsAverage: number | null;
	highestMonth: { label: string; total: number } | null;
	lowestMonth: { label: string; total: number } | null;
	yearToDate: number;
	allTimeMonthlyAverage: number;
	projectedThisMonth: number | null;
	biggestExpense: { description: string | null; amount: number } | null;
}

/**
 * Represents an account's current balance, derived from its starting balance
 * plus every entry that has moved money into or out of it (including
 * transfers).
 */
export interface AccountBalance {
	id: AccountId;
	name: string;
	type: AccountType;
	startingBalance: Balance;
	balance: Balance;
}

export type AccountSeries = { id: AccountId; name: string; points: DataPoint[] };
export type AccountTypeSeries = { type: AccountType; name: string; points: DataPoint[] };
