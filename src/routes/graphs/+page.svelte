<script lang="ts">
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import type { Component } from "svelte";
	import type { CategoryPoint, DataPoint, TimeRange } from "./+page.server.js";
	import { formatCurrency } from "$lib/utils/format.js";
	import TrendCards from "./TrendCards.svelte";
	import PopularDescriptions from "./PopularDescriptions.svelte";

	let { data } = $props();

	type NetWorthChartProps = { points: DataPoint[]; timeRange?: TimeRange };

	type CategoryChartProps = {
		points: CategoryPoint[];
		timeRange?: TimeRange;
	};

	// lazy load the chart so Chart.js only runs in the browser
	let NetWorthChartComponent = $state<Component<NetWorthChartProps> | null>(null);
	let ExpensesCategoryChartComponent = $state<Component<CategoryChartProps> | null>(null);
	let IncomeCategoryChartComponent = $state<Component<CategoryChartProps> | null>(null);

	let netWorthLoadError = $state<string | null>(null);
	let expensesCategoryLoadError = $state<string | null>(null);
	let incomeCategoryLoadError = $state<string | null>(null);

	let selectedTimeRange = $state<TimeRange>("all");

	let activeSummary = $derived.by(() => {
		if (selectedTimeRange === "month") {
			return {
				income: data.summary.incomes.monthly || 0,
				expenses: data.summary.expenses.monthly || 0,
			};
		}

		if (selectedTimeRange === "year") {
			return {
				income: data.summary.incomes.yearly || 0,
				expenses: data.summary.expenses.yearly || 0,
			};
		}

		// default "all" range
		return {
			income: data.summary.incomes.total || 0,
			expenses: data.summary.expenses.total || 0,
		};
	});

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
			expensesCategoryLoadError = "Failed to load chart. Please refresh the page.";
			console.log(e);
		}
	});
</script>

<h1>Graphs</h1>

{#if data.netWorthChart.points.length === 0}
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
				class:positive={data.summary.currentNetWorth >= 0}
				class:negative={data.summary.currentNetWorth < 0}
			>
				{formatCurrency(data.summary.currentNetWorth)}
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

	<!-- Net worth graph-->
	{#if netWorthLoadError}
		<p class="error">{netWorthLoadError}</p>
	{:else}
		<div class="chart-section">
			<h2>Net Worth Over Time</h2>
			<div class="chart-container">
				{#if NetWorthChartComponent}
					<NetWorthChartComponent
						points={data.netWorthChart.points}
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
		<TrendCards summary={data.trendCards.summary} />
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
						points={data.categoryChart.points}
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
						points={data.categoryChart.points}
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
		<PopularDescriptions descriptions={data.popularDescriptions} />
	</div>
{/if}
