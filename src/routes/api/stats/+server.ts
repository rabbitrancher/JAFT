// src/routes/api/stats/+server.ts
import { db } from "$lib/server/db";
import { accounts, entries } from "$lib/server/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

/**
 * Retrieves summary statistics across all accounts, including overall
 * account counts, total net worth, and each active account's current
 * balance.
 *
 * Archived accounts are excluded from the per-account breakdown, matching
 * the account filter, per-account chart lines, and this panel elsewhere in
 * the app. Their history still counts toward the combined (all-accounts)
 * totals, since that money and activity are real; only the individual-account
 * breakdown drops them.
 *
 * Balance = starting balance, plus income, minus expenses, plus transfers
 * received, minus transfers sent.
 *
 * @returns {Response} A JSON response containing account totals, overall net
 * worth, and each active account's balance, ordered by transaction count
 * (most to least).
 */
export const GET: RequestHandler = async () => {
	const [{ total, active, archived, startingTotal }] = await db
		.select({
			total: sql<number>`count(*)`,
			active: sql<number>`sum(case when ${accounts.archived} = 0 then 1 else 0 end)`,
			archived: sql<number>`sum(case when ${accounts.archived} = 1 then 1 else 0 end)`,
			startingTotal: sql<number>`coalesce(sum(${accounts.startingBalance}), 0)`,
		})
		.from(accounts);

	// transfers net to zero for overall net worth, only income/expense affect the total.
	const [{ netChange }] = await db
		.select({
			netChange: sql<number>`coalesce(sum(
				case ${entries.type}
					when 'income' then ${entries.amount}
					when 'expense' then -abs(${entries.amount})
					else 0
				end
			), 0)`,
		})
		.from(entries);

	const netWorth = startingTotal + netChange;

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
			net: sql<number>`sum(case
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

	const netByAccount: Record<number, number> = {};
	const countByAccount: Record<number, number> = {};

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

	const accountBalances = activeAccounts
		.map((a) => ({
			id: a.id,
			name: a.name,
			type: a.type,
			startingBalance: a.startingBalance,
			balance: Number((a.startingBalance + (netByAccount[a.id] ?? 0)).toFixed(2)),
		}))
		.sort((a, b) => (countByAccount[b.id] ?? 0) - (countByAccount[a.id] ?? 0));

	return json({
		totalAccounts: total,
		activeAccounts: active,
		archivedAccounts: archived,
		netWorth,
		accounts: accountBalances,
	});
};
