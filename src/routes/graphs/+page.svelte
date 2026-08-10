<script lang="ts">
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import type { Component } from "svelte";
	import { formatCurrency, toTitleCase } from "$lib/utils/format.js";
	import TrendCards from "./TrendCards.svelte";
	import PopularDescriptions from "./PopularDescriptions.svelte";
	import AccountBalances from "./AccountBalances.svelte";
	import type {
		DataPoint,
		TimeRange,
		CategoryPoint,
		AccountBalance,
		MoneyMovement,
		AccountId,
		AccountSeries,
		CategoryChartProps,
		AccountTypeSeries,
		NetWorthChartProps,
	} from "./graphContainers.js";
	import { isAccountType, type AccountType, accountTypes } from "$lib/accounts.js";

	let { data } = $props();

	// lazy load the chart so Chart.js only runs in the browser
	let NetWorthChartComponent = $state<Component<NetWorthChartProps> | null>(null);
	let ExpensesCategoryChartComponent = $state<Component<CategoryChartProps> | null>(null);
	let IncomeCategoryChartComponent = $state<Component<CategoryChartProps> | null>(null);

	let netWorthLoadError = $state<string | null>(null);
	let expensesCategoryLoadError = $state<string | null>(null);
	let incomeCategoryLoadError = $state<string | null>(null);

	let selectedTimeRange = $state<TimeRange>("all");

	/**
	 * The currently selected account filter.
	 *
	 * This can be either an account ID, an account type, or null (which represents "all accounts").
	 * It determines which data points are displayed in the graphs.
	 */
	let selectedAccountFilter = $state<AccountId | AccountType | null>(null);
	let isAccountFilterOpen = $state(false);
	let accountFilterContainer = $state<HTMLElement>();

	function handleWindowClick(event: MouseEvent) {
		if (
			isAccountFilterOpen &&
			accountFilterContainer &&
			!accountFilterContainer.contains(event.target as Node)
		) {
			isAccountFilterOpen = false;
		}
	}

	/**
	 * Derived state that determines the display name of the currently selected account filter.
	 *
	 * If the selected account filter is null, it defaults to "All Accounts".
	 * If the selected account filter is an account type, it uses the account type as the display name.
	 * Otherwise, it finds the name of the account balance that matches the selected account filter, or defaults to "All Accounts" if not found.
	 */
	let selectedFilterName = $derived(
		selectedAccountFilter === null
			? "All Accounts"
			: isAccountType(selectedAccountFilter)
				? toTitleCase(selectedAccountFilter)
				: (data.accountBalances.find((a: AccountBalance) => a.id === selectedAccountFilter)?.name ??
					"All Accounts"),
	);

	let netWorthPoints = $derived.by((): DataPoint[] => {
		if (selectedAccountFilter === null) {
			return data.netWorthChart.points;
		}

		if (isAccountType(selectedAccountFilter)) {
			return data.netWorthChart.byAccountType[selectedAccountFilter] ?? [];
		}

		return data.netWorthChart.byAccount[selectedAccountFilter] ?? [];
	});

	let netWorthAccountSeries = $derived.by((): AccountSeries[] => {
		return data.accountBalances.map((a: AccountBalance) => ({
			id: a.id,
			name: a.name,
			points: data.netWorthChart.byAccount[a.id] ?? [],
		}));
	});

	let netWorthTypeSeries = $derived.by((): AccountTypeSeries[] | null => {
		if (selectedAccountFilter !== null) {
			return null;
		}
		return accountTypes.map((type: AccountType) => ({
			type: type,
			name: toTitleCase(type),
			points: data.netWorthChart.byAccountType[type] ?? [],
		}));
	});

	// current net worth for whatever's selected is just the last point on
	// whichever line is showing
	let currentNetWorth = $derived(
		netWorthPoints.length > 0 ? netWorthPoints[netWorthPoints.length - 1].amount : 0,
	);

	/**
	 * Derives the filtered category points based on the currently selected account filter.
	 *
	 * If the selected account filter is null, it returns all category points.
	 * If the selected account filter is an account type, it filters category points by account type.
	 * Otherwise, it filters category points by account ID.
	 *
	 * @returns {CategoryPoint[]} The filtered category points
	 */
	let filteredCategoryPoints = $derived.by((): CategoryPoint[] => {
		if (selectedAccountFilter === null) {
			return data.categoryChart.points;
		}

		return data.categoryChart.points.filter((p: CategoryPoint) =>
			isAccountType(selectedAccountFilter)
				? p.accountType === selectedAccountFilter
				: p.accountId === selectedAccountFilter,
		);
	});

	const emptyMoneyMovement: MoneyMovement = { total: 0, thisYear: 0, thisMonth: 0 };

	let activeSummary = $derived.by(() => {
		const incomes =
			selectedAccountFilter === null
				? data.summary.incomes
				: isAccountType(selectedAccountFilter)
					? (data.summary.incomesByAccountType[selectedAccountFilter] ?? emptyMoneyMovement)
					: (data.summary.incomesByAccount[selectedAccountFilter] ?? emptyMoneyMovement);

		const expenses =
			selectedAccountFilter === null
				? data.summary.expenses
				: isAccountType(selectedAccountFilter)
					? (data.summary.expensesByAccountType[selectedAccountFilter] ?? emptyMoneyMovement)
					: (data.summary.expensesByAccount[selectedAccountFilter] ?? emptyMoneyMovement);

		if (selectedTimeRange === "month") {
			return {
				income: incomes.thisMonth || 0,
				expenses: expenses.thisMonth || 0,
			};
		}

		if (selectedTimeRange === "year") {
			return {
				income: incomes.thisYear || 0,
				expenses: expenses.thisYear || 0,
			};
		}

		// default "all" range
		return { income: incomes.total || 0, expenses: expenses.total || 0 };
	});

	// Spending Trends card follows the same account filter; every account
	// (even ones with zero expenses) has an entry in byAccount, so this
	// always resolves to a real (if all-zero) TrendSummary.
	let activeTrendSummary = $derived(
		selectedAccountFilter === null
			? data.trendCards.summary
			: isAccountType(selectedAccountFilter)
				? (data.trendCards.byAccountType[selectedAccountFilter] ?? data.trendCards.summary)
				: (data.trendCards.byAccount[selectedAccountFilter] ?? data.trendCards.summary),
	);

	let filteredPopularDescriptions = $derived(
		selectedAccountFilter === null
			? data.popularDescriptions.combined
			: isAccountType(selectedAccountFilter)
				? (data.popularDescriptions.byAccountType[selectedAccountFilter] ?? [])
				: (data.popularDescriptions.byAccount[selectedAccountFilter] ?? []),
	);
	/**
	 * Helper method to display text on the cards depending on the view
	 */
	let timeRangeLabel = $derived.by(() => {
		if (selectedTimeRange === "month") return "(This Month)";
		if (selectedTimeRange === "year") return "(This Year)";
		return "(All Time)";
	});

	onMount(async () => {
		try {
			// attach the separate page with the net worth graph
			const module = await import("./NetWorthGraph.svelte");
			NetWorthChartComponent = module.default as Component<NetWorthChartProps>;
		} catch (e) {
			netWorthLoadError = "Failed to load chart. Please refresh the page.";
			console.log(e);
		}

		try {
			// attach the separate page with the expenses per category graphs
			const module = await import("./ExpensesPerCategoryGraphs.svelte");
			ExpensesCategoryChartComponent = module.default as Component<CategoryChartProps>;
		} catch (e) {
			expensesCategoryLoadError = "Failed to load chart. Please refresh the page.";
			console.log(e);
		}

		try {
			// attach the separate page with the income per category graphs
			const module = await import("./IncomePerCategoryGraphs.svelte");
			IncomeCategoryChartComponent = module.default as Component<CategoryChartProps>;
		} catch (e) {
			incomeCategoryLoadError = "Failed to load chart. Please refresh the page.";
			console.log(e);
		}
	});
</script>

<svelte:window onclick={handleWindowClick} />

<div class="header-row">
	<h1>Graphs</h1>

	{#if data.accountBalances.length > 0}
		<div class="dropdown-container" bind:this={accountFilterContainer}>
			<button
				class="pill"
				class:active={isAccountFilterOpen}
				onclick={() => (isAccountFilterOpen = !isAccountFilterOpen)}
				type="button"
			>
				{#if isAccountType(selectedAccountFilter)}
					Account Type: {selectedFilterName}
				{:else}
					Account: {selectedFilterName}
				{/if}
			</button>

			{#if isAccountFilterOpen}
				<div class="dropdown-menu account-filter-menu">
					<div class="dropdown-header">
						<h4>Filter by Account</h4>
						<button class="close-btn" onclick={() => (isAccountFilterOpen = false)}>✕</button>
					</div>

					<!-- Changed to radio-list -->
					<div class="radio-list">
						<!-- Changed to radio-label -->
						<label class="radio-label">
							<input
								type="radio"
								name="account-filter"
								checked={selectedAccountFilter === null}
								onchange={() => {
									selectedAccountFilter = null;
									isAccountFilterOpen = false;
								}}
							/>
							All Accounts
						</label>

						{#each data.accountBalances as account (account.id)}
							<label class="radio-label">
								<input
									type="radio"
									name="account-filter"
									checked={selectedAccountFilter === account.id}
									onchange={() => {
										selectedAccountFilter = account.id;
										isAccountFilterOpen = false;
									}}
								/>
								{account.name}
							</label>
						{/each}

						{#each [...new Set(data.accountBalances.map((a) => a.type))] as accountType (accountType)}
							<label class="radio-label">
								<input
									type="radio"
									name="account-filter"
									checked={selectedAccountFilter === accountType}
									onchange={() => {
										selectedAccountFilter = accountType;
										isAccountFilterOpen = false;
									}}
								/>
								Account Type: {accountType}
							</label>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if data.accountBalances.length === 0 && data.summary.incomes.total === 0 && data.summary.expenses.total === 0}
	<p>
		No entries yet - add some on the <a href={resolve("/entry")}>entry page</a> to see some data!
	</p>
{:else}
	<!-- Summary stats -->
	<div class="summary-row">
		<div class="summary-card">
			<p class="summary-label">Current Net Worth</p>
			<p
				class="summary-value"
				class:positive={currentNetWorth >= 0}
				class:negative={currentNetWorth < 0}
			>
				{formatCurrency(currentNetWorth)}
			</p>
		</div>
		<div class="summary-card">
			<p class="summary-label">Total Income {timeRangeLabel}</p>
			<p class="summary-value positive">{formatCurrency(activeSummary.income)}</p>
		</div>
		<div class="summary-card">
			<p class="summary-label">Total Expenses {timeRangeLabel}</p>
			<p class="summary-value negative">{formatCurrency(activeSummary.expenses)}</p>
		</div>
	</div>

	<!-- Account Balances -->
	{#if data.accountBalances.length > 0}
		<div class="chart-section">
			<h2>Account Balances</h2>
			<AccountBalances accounts={data.accountBalances} />
		</div>
	{/if}

	<!-- Net worth graph-->
	{#if netWorthLoadError}
		<p class="error">{netWorthLoadError}</p>
	{:else}
		<div class="chart-section">
			<h2>Net Worth Over Time</h2>
			<div class="chart-container">
				{#if NetWorthChartComponent}
					<NetWorthChartComponent
						points={netWorthPoints}
						accountSeries={netWorthAccountSeries}
						accountTypeSeries={netWorthTypeSeries}
						byTypePerAccount={data.netWorthChart.byTypePerAccount}
						selectedAccountType={isAccountType(selectedAccountFilter)
							? selectedAccountFilter
							: null}
						bind:timeRange={selectedTimeRange}
					/>
				{:else}
					<p class="loading-text">Loading chart...</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Trends cards -->
	<div class="chart-section">
		<h2>Spending Trends</h2>
		<TrendCards summary={activeTrendSummary} />
	</div>

	<!-- Expenses by category graphs-->
	{#if expensesCategoryLoadError}
		<p class="error">{expensesCategoryLoadError}</p>
	{:else}
		<div class="chart-section">
			<h2>Expenses by Category</h2>
			<div class="chart-container-stacked-graphs">
				{#if ExpensesCategoryChartComponent}
					<ExpensesCategoryChartComponent
						points={filteredCategoryPoints}
						bind:timeRange={selectedTimeRange}
					/>
				{:else}
					<p class="loading-text">Loading chart...</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Income by category graphs-->
	{#if incomeCategoryLoadError}
		<p class="error">{incomeCategoryLoadError}</p>
	{:else}
		<div class="chart-section">
			<h2>Income by Category</h2>
			<div class="chart-container-stacked-graphs">
				{#if IncomeCategoryChartComponent}
					<IncomeCategoryChartComponent
						points={filteredCategoryPoints}
						bind:timeRange={selectedTimeRange}
					/>
				{:else}
					<p class="loading-text">Loading chart...</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Popular Descriptions grid -->
	<div class="chart-section">
		<h2>Popular Descriptions</h2>
		<PopularDescriptions descriptions={filteredPopularDescriptions} />
	</div>
{/if}
