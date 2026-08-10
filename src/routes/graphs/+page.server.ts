import { db } from "$lib/server/db";
import { accounts, categories, entries } from "$lib/server/db/schema";
import { accountTypes, type AccountId, type AccountType } from "$lib/types/accounts";
import type { NetWorthChart, PopularDescription } from "$lib/types/graphs/graphs";
import type {
	MoneyMovement,
	DailyBalanceChanges,
	DateString,
	BalanceChange,
	Balance,
	DataPoint,
	FinancialSummary,
	CategoryPoint,
	CashFlowType,
	TrendSummary,
	TrendPoint,
	AccountBalance,
} from "$lib/types/graphs/types";
import { and, asc, eq, isNotNull, ne, sql } from "drizzle-orm";

/**
 * Loads the necessary data for the application.
 *
 * This function fetches and processes data from the database, including the
 * user's summary, net worth chart, category chart, and spending trends.
 *
 * @returns The user's summary, net worth chart, category chart, and trend
 * summary information
 */
export async function load() {
	const [
		{ summary, netWorthChart },
		categoryChart,
		{ trendSummary, byAccount: trendsByAccount, byAccountType: trendsByAccountType },
		popularDescriptions,
		accountBalances,
	] = await Promise.all([
		getSummaryAndNetWorth(),
		getCategoryChart(),
		getSpendingTrends(),
		getPopularDescriptions(),
		getAccountBalances(),
	]);

	return {
		summary,
		netWorthChart,
		categoryChart,
		trendCards: {
			summary: trendSummary,
			byAccount: trendsByAccount,
			byAccountType: trendsByAccountType,
		},
		popularDescriptions,
		accountBalances,
	};
}

/**
 * Retrieves a summary of the user's financial data, including their current net
 * worth and a chart of their net worth over time.
 *
 * This function queries the database for all entries, calculates the user's
 * current net worth and net worth chart points, and returns them as an object.
 *
 * @returns A promise resolving to an object containing the user's summary and
 * net worth chart data
 */
async function getSummaryAndNetWorth() {
	const [allEntries, allAccounts] = await Promise.all([
		db
			.select({
				date: entries.date,
				amount: entries.amount,
				type: entries.type,
				accountId: entries.account_id,
				toAccountId: entries.to_account_id,
			})
			.from(entries)
			.orderBy(asc(entries.date)),

		db
			.select({
				id: accounts.id,
				startingBalance: accounts.startingBalance,
				type: accounts.type,
				archived: accounts.archived,
			})
			.from(accounts),
	]);

	const startingNetWorth = allAccounts.reduce((sum, a) => sum + a.startingBalance, 0);

	const accountTypeById = new Map(allAccounts.map((a) => [a.id, a.type]));

	const now = new Date();

	const incomes: MoneyMovement = {
		total: 0,
		thisYear: 0,
		thisMonth: 0,
	};

	const expenses: MoneyMovement = {
		total: 0,
		thisYear: 0,
		thisMonth: 0,
	};

	const incomesByAccount = new Map<AccountId, MoneyMovement>();
	const expensesByAccount = new Map<AccountId, MoneyMovement>();

	const incomesByType = new Map<AccountType, MoneyMovement>();
	const expensesByType = new Map<AccountType, MoneyMovement>();

	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

	const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

	const dailyNetChanges: DailyBalanceChanges = {};
	const dailyNetChangeByAccount = new Map<AccountId, DailyBalanceChanges>();

	const dailyNetChangeByType = new Map<AccountType, DailyBalanceChanges>();

	/**
	 * Adds a change in account balance for a specific date, keyed by account ID.
	 *
	 * This function updates the daily net change for the given account ID and date.
	 * It also determines the account type for the given account ID and calls
	 * `addAccountTypeChange` to update the daily net change for the account type.
	 *
	 * @param accountId The ID of the account to update.
	 * @param dateStr The date of the change, in the format 'YYYY-MM-DD'.
	 * @param amount The amount of the change.
	 */
	function addAccountChange(
		accountId: AccountId | null,
		dateStr: DateString,
		amount: BalanceChange,
	) {
		if (accountId === null) return;

		const netChangesForAccount = dailyNetChangeByAccount.get(accountId) ?? {};
		netChangesForAccount[dateStr] = (netChangesForAccount[dateStr] || 0) + amount;
		dailyNetChangeByAccount.set(accountId, netChangesForAccount);

		const accountType = accountTypeById.get(accountId) ?? null;

		addAccountTypeChange(accountType, dateStr, amount);
	}

	/**
	 * Adds a change in account balance for a specific date, keyed by account type.
	 *
	 * @param accountType The type of the account to update.
	 * @param dateStr The date of the change, in the format 'YYYY-MM-DD'.
	 * @param amount The amount of the change.
	 */
	function addAccountTypeChange(
		accountType: AccountType | null,
		dateStr: DateString,
		amount: BalanceChange,
	) {
		if (accountType === null) return;

		const netChangesForType = dailyNetChangeByType.get(accountType) ?? {};
		netChangesForType[dateStr] = (netChangesForType[dateStr] || 0) + amount;
		dailyNetChangeByType.set(accountType, netChangesForType);
	}

	/**
	 * Updates a MoneyMovement entry in the provided map, based on the given key, date, and amount.
	 *
	 * If the key is null, the function does nothing. Otherwise, it looks up the MoneyMovement
	 * entry in the map for the given key, or creates a new entry if it doesn't exist.
	 * It then updates the total, yearly, and monthly amounts in the entry based on the given date and amount.
	 *
	 * @param map The map to update, where keys are AccountId or AccountType and values are MoneyMovement objects.
	 * @param key The key to look up in the map, or null to do nothing.
	 * @param dateStr The date string to use for determining the yearly and monthly buckets.
	 * @param amount The amount to add to the MoneyMovement entry.
	 * @template K The type of key, which must be either AccountId or AccountType.
	 */
	function addMoneyMovement<K extends AccountId | AccountType>(
		map: Map<K, MoneyMovement>,
		key: K | null,
		dateStr: DateString,
		amount: BalanceChange,
	) {
		if (key === null) {
			return;
		}

		const moneyData = map.get(key) ?? {
			total: 0,
			thisYear: 0,
			thisMonth: 0,
		};

		moneyData.total += amount;

		if (dateStr >= yearStart) {
			moneyData.thisYear += amount;
		}

		if (dateStr >= monthStart) {
			moneyData.thisMonth += amount;
		}

		map.set(key, moneyData);
	}

	allEntries.forEach((e) => {
		if (!e.date) return;

		const dateStr = new Date(e.date + "T00:00:00").toISOString().split("T")[0];

		// transfers move money between two of the user's own accounts, so they
		// net to zero for overall net worth, but they do shift each account's
		// individual balance (out of the source, into the destination).
		if (e.type === "transfer") {
			const amount = Math.abs(e.amount);

			addAccountChange(e.accountId, dateStr, -amount);
			addAccountChange(e.toAccountId, dateStr, amount);

			return;
		}

		const amount = e.type === "expense" ? -Math.abs(e.amount) : Math.abs(e.amount);

		dailyNetChanges[dateStr] = (dailyNetChanges[dateStr] || 0) + amount;

		addAccountChange(e.accountId, dateStr, amount);

		const moneyMovement = e.type === "expense" ? expenses : incomes;

		const moneyMovementByAccount = e.type === "expense" ? expensesByAccount : incomesByAccount;

		const moneyMovementByAccountType = e.type === "expense" ? expensesByType : incomesByType;

		moneyMovement.total += e.amount;

		if (dateStr >= yearStart) {
			moneyMovement.thisYear += e.amount;
		}

		if (dateStr >= monthStart) {
			moneyMovement.thisMonth += e.amount;
		}

		addMoneyMovement(moneyMovementByAccount, e.accountId, dateStr, e.amount);

		const accountType =
			(e.accountId !== null ? accountTypeById.get(e.accountId) : undefined) ?? null;
		addMoneyMovement(moneyMovementByAccountType, accountType, dateStr, e.amount);
	});

	/**
	 * Builds a sequence of data points representing a running total, starting from
	 * a specified initial value and incorporating a series of changes over time.
	 *
	 * @param startingBalance The initial value of the running total.
	 * @param changes An object mapping date strings to changes in the running total.
	 * @returns An array of DataPoint objects, where each point represents the running
	 * total at a specific date.
	 */
	function buildRunningPoints(startingBalance: Balance, changes: DailyBalanceChanges): DataPoint[] {
		const sortedDates = Object.keys(changes).sort();

		const baselineDate = sortedDates.length > 0 ? sortedDates[0] : now.toISOString().split("T")[0];

		const points: DataPoint[] = [{ date: baselineDate, amount: startingBalance }];

		let running = startingBalance;

		sortedDates.forEach((dateStr) => {
			running += changes[dateStr];

			if (dateStr === baselineDate) {
				// fold same-day activity into the baseline point instead of a
				// duplicate x value
				points[0].amount = running;
				return;
			}

			points.push({
				date: dateStr,
				amount: running,
			});
		});

		return points;
	}

	const netWorthPoints = buildRunningPoints(startingNetWorth, dailyNetChanges);

	const byAccount: Record<AccountId, DataPoint[]> = {};

	const byTypePerAccount: Record<AccountType, Record<AccountId, DataPoint[]>> = {
		checking: {},
		savings: {},
		cash: {},
		investment: {},
		other: {},
	};

	/**
	 * A record of maps, where each key is an account type and each value is a map
	 * of date strings to balance changes. Used to aggregate balance changes by
	 * account type.
	 */
	const typeAggregators: Record<AccountType, Map<DateString, Balance>> = {
		checking: new Map(),
		savings: new Map(),
		cash: new Map(),
		investment: new Map(),
		other: new Map(),
	};

	allAccounts
		.filter((a) => !a.archived)
		.forEach((a) => {
			const accountPoints = buildRunningPoints(
				a.startingBalance,
				dailyNetChangeByAccount.get(a.id) ?? {},
			);

			byAccount[a.id] = accountPoints;
			byTypePerAccount[a.type][a.id] = accountPoints;

			const aggregator = typeAggregators[a.type];
			for (let i = 0; i < accountPoints.length; i++) {
				const pt = accountPoints[i];
				const current = aggregator.get(pt.date) ?? 0;
				aggregator.set(pt.date, current + pt.amount);
			}
		});

	const byAccountType: Record<AccountType, DataPoint[]> = {
		checking: [],
		savings: [],
		cash: [],
		investment: [],
		other: [],
	};

	for (const key in typeAggregators) {
		const type = key as AccountType;

		const aggregatedPoints = Array.from(typeAggregators[type], ([date, amount]) => ({
			date,
			amount,
		}));

		aggregatedPoints.sort((a, b) => a.date.localeCompare(b.date));

		byAccountType[type] = aggregatedPoints;
	}

	return {
		summary: {
			currentNetWorth:
				netWorthPoints.length > 0 ? netWorthPoints[netWorthPoints.length - 1].amount : 0,
			incomes,
			expenses,
			incomesByAccount: Object.fromEntries(incomesByAccount),
			incomesByAccountType: Object.fromEntries(incomesByType) as Record<AccountType, MoneyMovement>,
			expensesByAccount: Object.fromEntries(expensesByAccount),
			expensesByAccountType: Object.fromEntries(expensesByType) as Record<
				AccountType,
				MoneyMovement
			>,
		} satisfies FinancialSummary,
		netWorthChart: {
			points: netWorthPoints,
			byAccount,
			byAccountType,
			byTypePerAccount,
		} satisfies NetWorthChart,
	};
}

/**
 * Retrieves a chart of spending by category.
 *
 * This function queries the database for all entries, joins them with their
 * corresponding categories, and returns a chart of spending by category. "Transfer" entries are ignored.
 *
 * @returns A promise resolving to an object containing the category chart data
 */
async function getCategoryChart() {
	const categoryEntries = await db
		.select({
			date: entries.date,
			amount: entries.amount,
			category: categories.name,
			type: entries.type,
			accountId: entries.account_id,
			accountType: accounts.type,
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.leftJoin(accounts, eq(entries.account_id, accounts.id))
		.where(ne(entries.type, "transfer"))
		.orderBy(asc(entries.date));

	const categoryPoints: CategoryPoint[] = categoryEntries
		.filter(
			(
				e,
			): e is typeof e & {
				category: string;
				type: CashFlowType;
				accountType: AccountType;
			} => e.category !== null && e.accountType !== null && !!e.date,
		)
		.map((e) => ({
			x: new Date(e.date + "T00:00:00").toISOString().split("T")[0],
			y: Math.abs(e.amount),
			category: e.category,
			cashFlowType: e.type,
			accountId: e.accountId,
			accountType: e.accountType,
		}));
	return {
		points: categoryPoints,
	};
}

/**
 * Retrieves a summary of spending trends, both combined across all accounts and
 * broken out per account.
 *
 * This function queries the database once for all expense entries, then derives
 * monthly totals, moving averages, and the rest of the trend summary from that
 * single result set, once for all accounts combined, and once more per account
 * so the client can switch views without a refetch.
 *
 * @returns A promise resolving to the combined trend summary plus a per-account
 * breakdown
 */
async function getSpendingTrends() {
	const [expenseEntries, allAccounts] = await Promise.all([
		db
			.select({
				date: entries.date,
				amount: entries.amount,
				description: entries.description,
				accountId: entries.account_id,
				accountType: accounts.type,
			})
			.from(entries)
			.leftJoin(accounts, eq(entries.account_id, accounts.id))
			.where(eq(entries.type, "expense"))
			.orderBy(asc(entries.date)),

		db.select({ id: accounts.id }).from(accounts),
	]);

	type ExpenseRow = (typeof expenseEntries)[number];

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
	const currentYear = String(now.getFullYear());
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

	/**
	 * Builds a TrendSummary from a set of expense rows.
	 */
	function computeTrendSummary(rows: ExpenseRow[]): TrendSummary {
		const monthlyTotals: Record<string, number> = {};
		rows.forEach((r) => {
			if (!r.date) return;
			const month = r.date.slice(0, 7);
			monthlyTotals[month] = (monthlyTotals[month] || 0) + r.amount;
		});

		const sortedMonths = Object.keys(monthlyTotals).sort();
		const rawTotals = sortedMonths.map((m) => Math.abs(monthlyTotals[m]));

		const windowSize = 3;
		const trendPoints: TrendPoint[] = sortedMonths.map((month, i) => {
			const windowStart = Math.max(0, i - windowSize + 1);
			const window = rawTotals.slice(windowStart, i + 1);
			const movingAverage =
				i >= windowSize - 1 ? window.reduce((a, b) => a + b, 0) / window.length : null;
			return { month, total: Math.abs(monthlyTotals[month]), movingAverage };
		});

		const currentMonth = trendPoints.find((p) => p.month === currentMonthKey)?.total ?? 0;
		const previousMonth = trendPoints.find((p) => p.month === previousMonthKey)?.total ?? 0;

		// the average as of *last* month, so "this month vs average" isn't
		// comparing the current month against a number that already includes
		// itself
		const priorPoint = trendPoints.find((p) => p.month === previousMonthKey);
		const threeMonthAverage = priorPoint?.movingAverage ?? null;

		const highest = trendPoints.reduce<TrendPoint | null>(
			(max, p) => (!max || p.total > max.total ? p : max),
			null,
		);
		const lowest = trendPoints.reduce<TrendPoint | null>(
			(min, p) => (!min || p.total < min.total ? p : min),
			null,
		);

		const yearToDate = trendPoints
			.filter((p) => p.month.startsWith(currentYear))
			.reduce((sum, p) => sum + p.total, 0);

		const allTimeMonthlyAverage =
			rawTotals.length > 0 ? rawTotals.reduce((a, b) => a + b, 0) / rawTotals.length : 0;

		// pace-based projection: at this rate, what will the full month total
		// be?
		const projectedThisMonth = dayOfMonth > 0 ? (currentMonth / dayOfMonth) * daysInMonth : null;

		// biggest single expense this month
		const biggestThisMonth = rows
			.filter((r) => r.date && r.date >= monthStart)
			.reduce<ExpenseRow | null>((max, r) => (!max || r.amount > max.amount ? r : max), null);

		return {
			currentMonth,
			previousMonth,
			percentChangeVsLastMonth:
				previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : null,
			threeMonthAverage,
			percentChangeVsAverage:
				threeMonthAverage && threeMonthAverage > 0
					? ((currentMonth - threeMonthAverage) / threeMonthAverage) * 100
					: null,
			highestMonth: highest ? { label: highest.month, total: highest.total } : null,
			lowestMonth: lowest ? { label: lowest.month, total: lowest.total } : null,
			yearToDate,
			allTimeMonthlyAverage,
			projectedThisMonth,
			biggestExpense: biggestThisMonth
				? { description: biggestThisMonth.description, amount: Math.abs(biggestThisMonth.amount) }
				: null,
		};
	}

	const trendSummary = computeTrendSummary(expenseEntries);

	const byAccount: Record<number, TrendSummary> = {};
	allAccounts.forEach((a) => {
		byAccount[a.id] = computeTrendSummary(expenseEntries.filter((r) => r.accountId === a.id));
	});

	const byAccountType: Record<AccountType, TrendSummary> = {} as Record<AccountType, TrendSummary>;

	accountTypes.forEach((type) => {
		byAccountType[type] = computeTrendSummary(expenseEntries.filter((r) => r.accountType === type));
	});

	return {
		trendSummary,
		byAccount,
		byAccountType,
	};
}

/**
 * Retrieves the most frequently occurring expense descriptions across all accounts.
 *
 * This function queries the database for all entries with non-empty descriptions,
 * then aggregates the results by description, counting occurrences and summing
 * amounts per description. The results are returned as a combined list, plus
 * separate lists per account and per account type.
 *
 * @param limit The maximum number of descriptions to return in each list (default: 10)
 * @returns A promise resolving to an object containing the combined popular descriptions,
 * plus popular descriptions by account and by account type.
 */
async function getPopularDescriptions(limit = 10) {
	const rows = await db
		.select({
			description: entries.description,
			amount: entries.amount,
			accountId: entries.account_id,
			accountType: accounts.type,
		})
		.from(entries)
		.leftJoin(accounts, eq(entries.account_id, accounts.id))
		.where(and(isNotNull(entries.description), ne(entries.description, "")));

	type DescriptionRow = (typeof rows)[number];

	/**
	 * Aggregates a set of description rows into ranked PopularDescription
	 * entries, counting occurrences and summing amounts per description.
	 *
	 * @param rowsToAggregate The description rows to aggregate
	 * @returns The aggregated PopularDescription entries
	 */
	function computePopularDescriptions(rowsToAggregate: DescriptionRow[]): PopularDescription[] {
		const stats = new Map<string, { count: number; total: number }>();

		rowsToAggregate.forEach((r) => {
			if (!r.description) return;

			const entry = stats.get(r.description) ?? { count: 0, total: 0 };
			entry.count += 1;
			entry.total += r.amount;
			stats.set(r.description, entry);
		});

		return Array.from(stats, ([description, { count, total }]) => ({
			description,
			count,
			total: Math.abs(total),
		}))
			.sort((a, b) => b.count - a.count)
			.slice(0, limit);
	}

	const combined = computePopularDescriptions(rows);

	const byAccount: Record<AccountId, PopularDescription[]> = {};
	const accountIds = new Set(
		rows.map((r) => r.accountId).filter((id): id is AccountId => id !== null),
	);
	accountIds.forEach((id) => {
		byAccount[id] = computePopularDescriptions(rows.filter((r) => r.accountId === id));
	});

	const byAccountType = {} as Record<AccountType, PopularDescription[]>;
	accountTypes.forEach((type) => {
		byAccountType[type] = computePopularDescriptions(rows.filter((r) => r.accountType === type));
	});

	return { combined, byAccount, byAccountType };
}

/**
 * Retrieves each active (non-archived) account's current balance.
 *
 * Archived accounts are excluded here since this is the list the UI uses to
 * populate the account filter, the per-account chart lines, and this panel
 * itself — archived accounts are kept out of all three. Their history still
 * counts toward the combined (all-accounts) totals elsewhere, since that money
 * and activity are real; only the individual-account breakdown drops them.
 *
 * Balance = starting balance, plus income, minus expenses, plus transfers
 * received, minus transfers sent.
 *
 * @returns A promise resolving to an array of AccountBalance objects, ordered
 * by each account's transaction totals, going from most transactions to least
 * transactions.
 */
async function getAccountBalances() {
	const activeAccounts = await db
		.select({
			id: accounts.id,
			name: accounts.name,
			type: accounts.type,
			startingBalance: accounts.startingBalance,
		})
		.from(accounts)
		.where(eq(accounts.archived, false))
		.orderBy(asc(accounts.name));

	// net effect on the *originating* account (entries.account_id) for every
	// entry: income adds, expense subtracts, and a transfer subtracts (it's
	// leaving this account).
	const outgoing = await db
		.select({
			accountId: entries.account_id,
			net: sql<Balance>`sum(case
			when ${entries.type} = 'income' then ${entries.amount}
			when ${entries.type} = 'expense' then -abs(${entries.amount})
			when ${entries.type} = 'transfer' then -abs(${entries.amount})
			else 0
		end)`,
			entryCount: sql<number>`count(*)`,
		})
		.from(entries)
		.groupBy(entries.account_id);

	// transfers also credit the *destination* account (entries.to_account_id).
	const incomingTransfers = await db
		.select({
			accountId: entries.to_account_id,
			net: sql<number>`sum(abs(${entries.amount}))`,
		})
		.from(entries)
		.where(and(eq(entries.type, "transfer"), isNotNull(entries.to_account_id)))
		.groupBy(entries.to_account_id);

	const netByAccount: Record<AccountId, Balance> = {};
	const countByAccount: Record<AccountId, number> = {};

	outgoing.forEach((row) => {
		if (row.accountId !== null) {
			netByAccount[row.accountId] = (netByAccount[row.accountId] ?? 0) + row.net;

			countByAccount[row.accountId] = row.entryCount;
		}
	});
	incomingTransfers.forEach((row) => {
		if (row.accountId !== null)
			netByAccount[row.accountId] = (netByAccount[row.accountId] ?? 0) + row.net;
	});

	return activeAccounts
		.map((a): AccountBalance => ({
			id: a.id,
			name: a.name,
			type: a.type,
			startingBalance: a.startingBalance,
			balance: a.startingBalance + (netByAccount[a.id] ?? 0),
		}))
		.sort((a, b) => (countByAccount[b.id] ?? 0) - (countByAccount[a.id] ?? 0));
}
