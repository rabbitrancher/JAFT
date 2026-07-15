<script lang="ts">
	import type { TrendSummary } from "./+page.server";
	import { formatCurrency, formatMonthLabel } from "$lib/utils/format";

	let { summary } = $props<{ summary: TrendSummary }>();
</script>

<div class="summary-row">
	<div class="summary-card-capped">
		<p class="summary-label">Year to Date</p>
		<p class="summary-value">{formatCurrency(summary.yearToDate)}</p>
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">This Month</p>
		<p class="summary-value">{formatCurrency(summary.currentMonth)}</p>
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Vs. Last Month</p>
		{#if summary.percentChangeVsLastMonth === null}
			<p class="summary-value">—</p>
		{:else}
			<p
				class="summary-value"
				class:negative={summary.percentChangeVsLastMonth > 0}
				class:positive={summary.percentChangeVsLastMonth <= 0}
			>
				{summary.percentChangeVsLastMonth > 0 ? "▲" : "▼"}
				{Math.abs(summary.percentChangeVsLastMonth).toFixed(1)}%
			</p>
		{/if}
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Vs. 3-Month Average</p>
		{#if summary.percentChangeVsAverage === null}
			<p class="summary-value">—</p>
		{:else}
			<p
				class="summary-value"
				class:negative={summary.percentChangeVsAverage > 0}
				class:positive={summary.percentChangeVsAverage <= 0}
			>
				{summary.percentChangeVsAverage > 0 ? "▲" : "▼"}
				{Math.abs(summary.percentChangeVsAverage).toFixed(1)}%
			</p>
		{/if}
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Highest Spending Month</p>
		{#if summary.highestMonth}
			<p class="summary-value">{formatCurrency(summary.highestMonth.total)}</p>
			<p class="summary-sublabel">{formatMonthLabel(summary.highestMonth.label)}</p>
		{:else}
			<p class="summary-value">—</p>
		{/if}
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Lowest Spending Month</p>
		{#if summary.lowestMonth}
			<p class="summary-value">{formatCurrency(summary.lowestMonth.total)}</p>
			<p class="summary-sublabel">{formatMonthLabel(summary.lowestMonth.label)}</p>
		{:else}
			<p class="summary-value">—</p>
		{/if}
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">All-Time Monthly Average</p>
		<p class="summary-value">{formatCurrency(summary.allTimeMonthlyAverage)}</p>
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Projected This Month</p>
		{#if summary.projectedThisMonth === null}
			<p class="summary-value">—</p>
		{:else}
			<p
				class="summary-value"
				class:negative={summary.projectedThisMonth > summary.allTimeMonthlyAverage}
				class:positive={summary.projectedThisMonth <= summary.allTimeMonthlyAverage}
			>
				{formatCurrency(summary.projectedThisMonth)}
			</p>
			<p class="summary-sublabel">at current pace</p>
		{/if}
	</div>

	<div class="summary-card-capped">
		<p class="summary-label">Biggest Expense This Month</p>
		{#if summary.biggestExpense}
			<p class="summary-value">{formatCurrency(summary.biggestExpense.amount)}</p>
			<p class="summary-sublabel">{summary.biggestExpense.description ?? "No description"}</p>
		{:else}
			<p class="summary-value">—</p>
		{/if}
	</div>
</div>
