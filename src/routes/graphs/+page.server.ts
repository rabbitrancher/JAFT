import { db } from "$lib/server/db";
import { entries } from "$lib/server/db/schema";
import { asc } from "drizzle-orm";

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

/**
 * Represents a range of time that can be used to filter data.
 */
export type TimeRange = "all" | "month" | "year";

/**
 * Retrieves all entries from the database, including their corresponding category names, sorted by date in ascending order.
 *
 * @returns An array of objects containing entry information
 */
export async function load() {
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
		// aggregate net change per day — expenses negative, income positive
		const dailyNetChange: Record<string, number> = {};

		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
		const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

		allEntries.forEach((e) => {
			if (!e.date) {
				return;
			}
			const dateStr = new Date(e.date + "T00:00:00").toISOString().split("T")[0];
			const amount = e.type === "expense" ? -Math.abs(e.amount) : Math.abs(e.amount);
			dailyNetChange[dateStr] = (dailyNetChange[dateStr] || 0) + amount;

			let moneyMovement;

			// add to corresponding total values
			if (e.type === "expense") {
				moneyMovement = expenses;
			} else {
				moneyMovement = incomes;
			}

			moneyMovement.total += e.amount;

			if (dateStr >= yearStart) {
				moneyMovement.yearly += e.amount;
			}

			if (dateStr >= monthStart) {
				moneyMovement.monthly += e.amount;
			}
		});

		// compound daily changes into a running net worth
		let runningNetWorth = 0;
		Object.keys(dailyNetChange)
			.sort()
			.forEach((dateStr) => {
				runningNetWorth += dailyNetChange[dateStr];
				netWorthPoints.push({ x: dateStr, y: runningNetWorth });
			});
	}

	return {
		netWorthChart: { points: netWorthPoints },
		summary: {
			currentNetWorth: netWorthPoints.length > 0 ? netWorthPoints[netWorthPoints.length - 1].y : 0,
			incomes,
			expenses,
		},
	};
}
