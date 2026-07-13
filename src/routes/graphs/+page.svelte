<script lang="ts">
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import type { Component } from "svelte";
	import type { DataPoint, TimeRange } from "./+page.server.js";
	import { formatCurrency } from "$lib/utils/format.js";

	let { data } = $props();

	type ChartProps = { points: DataPoint[]; timeRange?: TimeRange };

	// lazy load the chart so Chart.js only runs in the browser
	let ChartComponent = $state<Component<ChartProps> | null>(null);

	let loadError = $state<string | null>(null);

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
			// attach the separate page with information about the net worth graph
			const module = await import("./NetWorthGraph.svelte");
			ChartComponent = module.default as Component<ChartProps>;
		} catch (e) {
			loadError = "Failed to load chart. Please refresh the page.";
			console.log(e);
		}
	});
</script>

<h1>Graphs</h1>

{#if data.netWorthChart.points.length === 0}
	<p>
		No entries yet — add some on the <a href={resolve("/entry")}>entry page</a> to see your net worth
		over time.
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
	{#if loadError}
		<p class="error">{loadError}</p>
	{:else}
		<div class="chart-section">
			<h2>Net Worth Over Time</h2>
			<div class="chart-container">
				{#if ChartComponent}
					<ChartComponent points={data.netWorthChart.points} bind:timeRange={selectedTimeRange} />
				{:else}
					<p class="loading-text">Loading chart...</p>
				{/if}
			</div>
		</div>
	{/if}
{/if}
