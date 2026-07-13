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
	} from "chart.js";
	import zoomPlugin from "chartjs-plugin-zoom";
	import "chartjs-adapter-date-fns";
	import type { DataPoint, TimeRange } from "./+page.server";
	import { formatCurrency } from "$lib/utils/format";

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		TimeScale,
		Filler,
		Tooltip,
		zoomPlugin,
	);

	let { points, timeRange = $bindable("all") } = $props<{
		points: DataPoint[];
		timeRange?: TimeRange;
	}>();

	let canvasElement = $state<HTMLCanvasElement>();
	// NOT $state, which avoids reactive loop but means page has to refresh for graph to refresh
	let chartInstance: Chart | null = null;

	let visiblePoints = $derived.by(() => {
		if (timeRange === "all") {
			return points;
		}
		const now = new Date();
		if (timeRange === "month") {
			const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
			return points.filter((p: DataPoint) => p.x >= start);
		}
		if (timeRange === "year") {
			const start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
			return points.filter((p: DataPoint) => p.x >= start);
		}
		return points;
	});

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
				datasets: [
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
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
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
					tooltip: {
						enabled: true,
						backgroundColor: tooltipBg,
						titleColor: tooltipText,
						bodyColor: tooltipText,
						titleFont: { size: 14, weight: "bold" },
						bodyFont: { size: 14 },
						padding: 12,
						cornerRadius: 8,
						displayColors: false,
						callbacks: {
							label: (context) =>
								context.parsed.y !== null ? formatCurrency(context.parsed.y) : "",
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
					const point = visiblePoints[elements[0].index];
					if (point) {
						window.location.href = `/table?date=${point.x}`;
					}
				},
			},
		});

		return () => chartInstance?.destroy();
	});

	// update chart data when visiblePoints changes without recreating the chart, for performance
	$effect(() => {
		if (!chartInstance) return;
		chartInstance.data.datasets[0].data = visiblePoints;
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
		<button class="button reset-zoom" onclick={resetZoom} type="button">Reset Zoom</button>
	</div>
	<canvas bind:this={canvasElement}></canvas>
</div>
