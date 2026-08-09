<script lang="ts">
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		TimeScale,
		Filler,
		Tooltip,
		Legend,
	} from "chart.js";
	import zoomPlugin from "chartjs-plugin-zoom";
	import "chartjs-adapter-date-fns";
	import { formatCurrency } from "$lib/utils/format";
	import { generatePalette } from "$lib/utils/colors";
	import type {
		AccountSeries,
		DataPoint,
		AccountTypeSeries as AccountTypeSeries,
		NetWorthChartProps,
	} from "./graphContainers";

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		TimeScale,
		Filler,
		Tooltip,
		Legend,
		zoomPlugin,
	);

	let {
		points,
		timeRange = $bindable("all"),
		accountSeries = null,
		accountTypeSeries = null,
		byTypePerAccount = null,
		selectedAccountType = null,
	}: NetWorthChartProps = $props();

	/**
	 * The current view mode of the graph.
	 * Can be one of "combined", "byAccount", or "byType".
	 * Default is "combined".
	 */
	let viewMode = $state<"combined" | "byAccount" | "byAccountType">("combined");

	$effect(() => {
		if (selectedAccountType !== null && viewMode === "byAccountType") {
			viewMode = "combined";
		}
	});

	let canvasElement = $state<HTMLCanvasElement>();
	// NOT $state, which avoids reactive loop but means page has to refresh for graph to refresh
	let chartInstance: Chart<"line", DataPoint[], unknown> | null = null;

	/**
	 * Filters an array of DataPoints by a specified time range.
	 *
	 * @param {DataPoint[]} points - The array of DataPoints to be filtered.
	 * @returns {DataPoint[]} A new array of DataPoints filtered by the specified time range.
	 */
	function filterByTimeRange(points: DataPoint[]) {
		if (timeRange === "all") return points;
		const now = new Date();
		if (timeRange === "month") {
			const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
			return points.filter((p) => p.date >= start);
		}
		if (timeRange === "year") {
			const start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
			return points.filter((p) => p.date >= start);
		}
		return points;
	}

	let visiblePoints = $derived(filterByTimeRange(points));

	function buildDatasets(lineColor: string) {
		// By Account
		// if an account type is selected, show only the accounts belonging to that type.
		if (viewMode === "byAccount") {
			if (selectedAccountType && byTypePerAccount?.[selectedAccountType]) {
				const accountsForType = byTypePerAccount[selectedAccountType];

				const accountIds = Object.keys(accountsForType);

				const palette = generatePalette(lineColor, accountIds.length);

				return accountIds.map((accountId, i) => {
					const id = Number(accountId);

					const account = accountSeries?.find((account) => account.id === id);

					return {
						label: account?.name ?? `Account ${id}`,
						data: filterByTimeRange(accountsForType[id]),
						borderColor: palette[i],
						tension: 0.1,
						fill: false,
					};
				});
			}

			// No account type selected:
			// preserve the existing "all accounts" behavior
			if (accountSeries && accountSeries.length > 0) {
				const palette = generatePalette(lineColor, accountSeries.length);

				return accountSeries.map((series: AccountSeries, i: number) => ({
					label: series.name,
					data: filterByTimeRange(series.points),
					borderColor: palette[i],
					tension: 0.1,
					fill: false,
				}));
			}
		}

		// By Account Type
		if (viewMode === "byAccountType" && accountTypeSeries && accountTypeSeries.length > 0) {
			const palette = generatePalette(lineColor, accountTypeSeries.length);

			return accountTypeSeries
				.filter((a) => a.points.length > 0)
				.map((series: AccountTypeSeries, i: number) => ({
					label: series.name,
					data: filterByTimeRange(series.points),
					borderColor: palette[i],
					tension: 0.1,
					fill: false,
				}));
		}

		// Combined
		// ff an account type is selected, show that type's combined balance
		if (selectedAccountType && accountTypeSeries) {
			const selectedTypeSeries = accountTypeSeries.find(
				(series) => series.type === selectedAccountType,
			);

			if (selectedTypeSeries) {
				return [
					{
						label: selectedTypeSeries.name,
						data: filterByTimeRange(selectedTypeSeries.points),
						borderColor: lineColor,
						tension: 0.1,
						fill: {
							target: "origin",
							above: lineColor + "22",
						},
					},
				];
			}
		}

		// normal combined net worth
		return [
			{
				label: "Net Worth",
				data: visiblePoints,
				borderColor: lineColor,
				tension: 0.1,
				fill: {
					target: "origin",
					above: lineColor + "22",
				},
			},
		];
	}

	function resetZoom() {
		chartInstance?.resetZoom();
	}

	// only create the chart once when the canvas is ready
	$effect(() => {
		if (!canvasElement) return;

		const style = getComputedStyle(document.documentElement);
		const lineColor = style.getPropertyValue("--primary").trim();
		const tooltipBg = style.getPropertyValue("--bg-alpha").trim();
		const tooltipText = style.getPropertyValue("--text").trim();
		const gridColor = style.getPropertyValue("--border-subtle").trim();
		const tickColor = style.getPropertyValue("--text-muted").trim();

		chartInstance = new Chart(canvasElement, {
			type: "line",
			data: {
				datasets: buildDatasets(lineColor),
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				parsing: {
					xAxisKey: "date",
					yAxisKey: "amount",
				},
				interaction: { mode: "index", intersect: false },
				elements: {
					point: { radius: 0, hoverRadius: 6 },
				},
				scales: {
					x: {
						type: "time",
						bounds: "data",
						time: { tooltipFormat: "PP", minUnit: "day" },
						ticks: {
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 8,
							padding: 10,
							color: tickColor,
						},
						grid: { color: gridColor },
					},
					y: {
						ticks: {
							callback: (value) => formatCurrency(Number(value)),
							color: tickColor,
						},
						grid: { color: gridColor },
					},
				},
				plugins: {
					legend: {
						display: viewMode !== "combined",
						labels: { color: tickColor },
					},
					tooltip: {
						enabled: true,
						backgroundColor: tooltipBg,
						titleColor: tooltipText,
						bodyColor: tooltipText,
						titleFont: { size: 14, weight: "bold" },
						bodyFont: { size: 14 },
						padding: 12,
						cornerRadius: 8,
						displayColors: viewMode !== "combined",
						callbacks: {
							labelColor: (context) => ({
								borderColor: context.dataset.borderColor as string,
								backgroundColor: context.dataset.borderColor as string,
							}),
							label: (context) =>
								context.parsed.y !== null
									? `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
									: "",
						},
					},

					zoom: {
						pan: { enabled: true, mode: "x" },
						zoom: {
							wheel: { enabled: true },
							pinch: { enabled: true },
							mode: "x",
						},
					},
				},
				onClick: (_event, elements) => {
					if (!elements.length) {
						return;
					}
					const dataset = elements[0].datasetIndex;
					const pointIndex = elements[0].index;
					const point = chartInstance?.data.datasets[dataset]?.data[pointIndex] as
						DataPoint | undefined;
					if (point) {
						window.location.href = `/table?date=${point.date}`;
					}
				},
			},
		});

		return () => chartInstance?.destroy();
	});

	// rebuild datasets whenever the underlying points, time range, or view
	// mode changes, without recreating the chart itself
	$effect(() => {
		if (!chartInstance) return;

		const style = getComputedStyle(document.documentElement);
		const lineColor = style.getPropertyValue("--primary").trim();

		chartInstance.data.datasets = buildDatasets(lineColor);

		const showLegend = viewMode !== "combined";
		if (chartInstance.options.plugins?.legend) {
			chartInstance.options.plugins.legend.display = showLegend;
		}
		if (chartInstance.options.plugins?.tooltip) {
			chartInstance.options.plugins.tooltip.displayColors = showLegend;
		}

		chartInstance.update();
	});
</script>

<div class="chart-wrapper">
	<div class="chart-controls">
		<button
			class="pill"
			class:active={timeRange === "all"}
			onclick={() => (timeRange = "all")}
			type="button"
		>
			All Time
		</button>
		<button
			class="pill"
			class:active={timeRange === "year"}
			onclick={() => (timeRange = "year")}
			type="button"
		>
			This Year
		</button>
		<button
			class="pill"
			class:active={timeRange === "month"}
			onclick={() => (timeRange = "month")}
			type="button"
		>
			This Month
		</button>
		<span style="width: 5rem"></span>
		{#if selectedAccountType}
			<button
				class="pill"
				class:active={viewMode === "combined"}
				onclick={() => (viewMode = "combined")}
				type="button"
			>
				Combined
			</button>

			{#if byTypePerAccount?.[selectedAccountType]}
				<button
					class="pill"
					class:active={viewMode === "byAccount"}
					onclick={() => (viewMode = "byAccount")}
					type="button"
				>
					By Account
				</button>
			{/if}
		{:else if (accountSeries && accountSeries.length > 0) || (accountTypeSeries && accountTypeSeries.length > 0)}
			<button
				class="pill"
				class:active={viewMode === "combined"}
				onclick={() => (viewMode = "combined")}
				type="button"
			>
				Combined
			</button>

			{#if accountSeries && accountSeries.length > 0}
				<button
					class="pill"
					class:active={viewMode === "byAccount"}
					onclick={() => (viewMode = "byAccount")}
					type="button"
				>
					By Account
				</button>
			{/if}

			{#if accountTypeSeries && accountTypeSeries.length > 0}
				<button
					class="pill"
					class:active={viewMode === "byAccountType"}
					onclick={() => (viewMode = "byAccountType")}
					type="button"
				>
					By Account Type
				</button>
			{/if}
		{/if}

		<button class="button reset-zoom" onclick={resetZoom} type="button">Reset Zoom</button>
	</div>
	<canvas bind:this={canvasElement}></canvas>
</div>
