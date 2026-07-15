import { db } from "$lib/server/db";
import { categories, entries } from "$lib/server/db/schema";
import { and, asc, count, desc, eq, gte, isNotNull, ne, sql } from "drizzle-orm";

/**
 * Represents a point on a chart with a date string x-axis and a numeric y-axis.
 */
export interface DataPoint {
	/**
	 * The date string represented by this data point.
	 */
	x: string;
	/**
	 * The numeric value of this data point.
	 */
	y: number;
}

export type TransactionType = "income" | "expense";

/**
 * Represents a point on the category chart with a date string x-axis, a numeric y-axis, and a category label.
 */
export interface CategoryPoint {
	/**
	 * The date string represented by this data point.
	 */
	x: string;
	/**
	 * The numeric value of this data point.
	 */
	y: number;
	/**
	 * The category label associated with this data point.
	 */
	category: string;
	/**
	 * The type of transaction, either an income or an expense.
	 */
	type: TransactionType;
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
	total: number;
	/**
	 * The moving average for this trend point, or null if not available.
	 */
	movingAverage: number | null;
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

export interface PopularDescription {
	description: string;
	count: number;
	total: number;
}

/**
 * Represents a range of time that can be used to filter data.
 */
export type TimeRange = "all" | "month" | "year";

/**
 * Loads the necessary data for the application.
 *
 * This function fetches and processes data from the database, including the user's summary,
 * net worth chart, category chart, and spending trends.
 *
 * @returns The user's summary, net worth chart, category chart, and trend summary information
 */
export async function load() {
	const [{ summary, netWorthChart }, categoryChart, { trendSummary }, popularDescriptions] =
		await Promise.all([
			getSummaryAndNetWorth(),
			getCategoryChart(),
			getSpendingTrends(),
			getPopularDescriptions(),
		]);

	return {
		summary,
		netWorthChart,
		categoryChart,
		trendCards: { summary: trendSummary },
		popularDescriptions,
	};
}

/**
 * Retrieves a summary of the user's financial data, including their current net worth and a chart of their net worth over time.
 *
 * This function queries the database for all entries, calculates the user's current net worth and net worth chart points,
 * and returns them as an object.
 *
 * @returns A promise resolving to an object containing the user's summary and net worth chart data
 */
async function getSummaryAndNetWorth() {
	const allEntries = await db
		.select({
			date: entries.date,
			amount: entries.amount,
			type: entries.type,
		})
		.from(entries)
		.orderBy(asc(entries.date));

	const netWorthPoints: DataPoint[] = [];
	const now = new Date();

	const incomes = { total: 0, yearly: 0, monthly: 0 };
	const expenses = { total: 0, yearly: 0, monthly: 0 };

	if (allEntries.length > 0) {
		const dailyNetChange: Record<string, number> = {};

		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

		const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

		allEntries.forEach((e) => {
			if (!e.date) return;

			const dateStr = new Date(e.date + "T00:00:00").toISOString().split("T")[0];

			const amount = e.type === "expense" ? -Math.abs(e.amount) : Math.abs(e.amount);

			dailyNetChange[dateStr] = (dailyNetChange[dateStr] || 0) + amount;

			const moneyMovement = e.type === "expense" ? expenses : incomes;

			moneyMovement.total += e.amount;

			if (dateStr >= yearStart) {
				moneyMovement.yearly += e.amount;
			}

			if (dateStr >= monthStart) {
				moneyMovement.monthly += e.amount;
			}
		});

		let runningNetWorth = 0;

		Object.keys(dailyNetChange)
			.sort()
			.forEach((dateStr) => {
				runningNetWorth += dailyNetChange[dateStr];

				netWorthPoints.push({
					x: dateStr,
					y: runningNetWorth,
				});
			});
	}

	return {
		summary: {
			currentNetWorth: netWorthPoints.length > 0 ? netWorthPoints[netWorthPoints.length - 1].y : 0,
			incomes,
			expenses,
		},
		netWorthChart: {
			points: netWorthPoints,
		},
	};
}

/**
 * Retrieves a chart of spending by category.
 *
 * This function queries the database for all entries, joins them with their corresponding categories,
 * and returns a chart of spending by category.
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
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.orderBy(asc(entries.date));

	const categoryPoints: CategoryPoint[] = categoryEntries
		.filter((e): e is typeof e & { category: string } => e.category !== null && !!e.date)
		.map((e) => ({
			x: new Date(e.date + "T00:00:00").toISOString().split("T")[0],
			y: Math.abs(e.amount),
			category: e.category,
			type: e.type,
		}));

	return {
		points: categoryPoints,
	};
}

/**
 * Retrieves a summary of spending trends.
 *
 * This function queries the database for monthly totals of expenses, calculates the moving average,
 * and returns a trend summary object.
 *
 * @returns A promise resolving to an object containing the trend summary information
 */
async function getSpendingTrends() {
	const monthlyTotals = await db
		.select({
			month: sql<string>`strftime('%Y-%m', ${entries.date})`,
			total: sql<number>`sum(${entries.amount})`,
		})
		.from(entries)
		.where(eq(entries.type, "expense"))
		.groupBy(sql`strftime('%Y-%m', ${entries.date})`)
		.orderBy(sql`strftime('%Y-%m', ${entries.date})`);

	const rawTotals = monthlyTotals.map((m) => Math.abs(m.total));

	const windowSize = 3;
	const trendPoints: TrendPoint[] = monthlyTotals.map((m, i) => {
		const windowStart = Math.max(0, i - windowSize + 1);
		const window = rawTotals.slice(windowStart, i + 1);
		const movingAverage =
			i >= windowSize - 1 ? window.reduce((a, b) => a + b, 0) / window.length : null;
		return { month: m.month, total: Math.abs(m.total), movingAverage };
	});

	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

	const currentMonth = trendPoints.find((p) => p.month === currentMonthKey)?.total ?? 0;
	const previousMonth = trendPoints.find((p) => p.month === previousMonthKey)?.total ?? 0;

	// the average as of *last* month, so "this month vs average" isn't comparing
	// the current month against a number that already includes itself
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

	const currentYear = String(now.getFullYear());
	const yearToDate = trendPoints
		.filter((p) => p.month.startsWith(currentYear))
		.reduce((sum, p) => sum + p.total, 0);

	const allTimeMonthlyAverage =
		rawTotals.length > 0 ? rawTotals.reduce((a, b) => a + b, 0) / rawTotals.length : 0;

	// pace-based projection: at this rate, what will the full month total be?
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const projectedThisMonth = dayOfMonth > 0 ? (currentMonth / dayOfMonth) * daysInMonth : null;

	// biggest single expense this month
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
	const [biggestThisMonth] = await db
		.select({ description: entries.description, amount: entries.amount })
		.from(entries)
		.where(and(eq(entries.type, "expense"), gte(entries.date, monthStart)))
		.orderBy(desc(entries.amount))
		.limit(1);

	const trendSummary: TrendSummary = {
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
	return { trendSummary };
}

/**
 * Retrieves the most common entry descriptions.
 *
 * This function queries the database for entry descriptions, counts and sums their occurrences,
 * and returns them in descending order of frequency.
 *
 * @param limit The maximum number of results to return (default: 10)
 * @returns A promise resolving to an array of PopularDescription objects
 */
async function getPopularDescriptions(limit = 10) {
	const results = await db
		.select({
			description: entries.description,
			count: count(entries.id),
			total: sql<number>`sum(${entries.amount})`,
		})
		.from(entries)
		.where(and(isNotNull(entries.description), ne(entries.description, "")))
		.groupBy(entries.description)
		.orderBy(desc(count(entries.id)))
		.limit(limit);

	return results.map((r) => ({
		description: r.description as string,
		count: r.count,
		total: Math.abs(r.total),
	})) satisfies PopularDescription[];
}
