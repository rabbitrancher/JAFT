<script lang="ts">
	import { onMount } from "svelte";
	import {
		ArcElement,
		Chart,
		BarController,
		BarElement,
		CategoryScale,
		DoughnutController,
		LinearScale,
		Tooltip,
	} from "chart.js";

	import type { CategoryPoint, TimeRange } from "./+page.server";
	import { formatCurrency } from "$lib/utils/format";
	import { SvelteMap } from "svelte/reactivity";
	import { generatePalette } from "$lib/utils/colors";
	Chart.register(
		ArcElement,
		BarController,
		BarElement,
		CategoryScale,
		DoughnutController,
		LinearScale,
		Tooltip,
	);

	let { points, timeRange = $bindable("all") } = $props<{
		points: CategoryPoint[];
		timeRange?: TimeRange;
		totalExpenses: number;
	}>();

	let barCanvas = $state<HTMLCanvasElement>();
	let barChartInstance: Chart | null = null;

	let donutCanvas = $state<HTMLCanvasElement>();
	let donutChartInstance: Chart | null = null;

	let excludedCategories = $state<string[]>([]);

	let isDropdownOpen = $state(false);

	onMount(() => {
		const saved = localStorage.getItem("graph_excluded_categories");
		if (saved) {
			excludedCategories = JSON.parse(saved);
		}
	});

	/**
	 * Toggles the exclusion of a category in the graph.
	 *
	 * @param {string} category The category to toggle exclusion for.
	 *
	 * If the category is already excluded, it will be included again. If it's not excluded, it will be excluded.
	 * The updated list of excluded categories will be saved to local storage.
	 */
	function toggleCategory(category: string) {
		if (excludedCategories.includes(category)) {
			excludedCategories = excludedCategories.filter((c) => c !== category);
		} else {
			excludedCategories = [...excludedCategories, category];
		}
		localStorage.setItem("graph_excluded_categories", JSON.stringify(excludedCategories));
	}

	/**
	 * Holds a static list of available categories for the expenses checkboxes.
	 */
	let allCategories = $derived.by<string[]>(() => {
		const unique = new Set<string>(
			points
				.filter((p: CategoryPoint) => p.type === "expense")
				.map((p: CategoryPoint) => p.category),
		);
		return Array.from(unique).sort();
	});

	let visiblePoints = $derived.by(() => {
		if (timeRange === "all") return points;

		const now = new Date();

		if (timeRange === "month") {
			const start = new Date(now.getFullYear(), now.getMonth(), 1);
			return points.filter((p: CategoryPoint) => new Date(p.x) >= start);
		}

		if (timeRange === "year") {
			const start = new Date(now.getFullYear(), 0, 1);
			return points.filter((p: CategoryPoint) => new Date(p.x) >= start);
		}

		return points;
	});

	let categoryExpenseTotals = $derived.by(() => {
		const totals = new SvelteMap<string, number>();

		for (const point of visiblePoints.filter(
			(p: CategoryPoint) => p.type === "expense" && !excludedCategories.includes(p.category),
		)) {
			totals.set(point.category, (totals.get(point.category) ?? 0) + point.y);
		}

		return [...totals.entries()].sort((a, b) => b[1] - a[1]);
	});

	let filteredTotalExpenses = $derived(
		categoryExpenseTotals.reduce((sum, [, amount]) => sum + amount, 0),
	);

	let activeCategoryCount = $derived(allCategories.length - excludedCategories.length);

	// to handle clicking outside the dropdown to close it
	let dropdownContainer = $state<HTMLElement>();

	function handleWindowClick(event: MouseEvent) {
		if (isDropdownOpen && dropdownContainer && !dropdownContainer.contains(event.target as Node)) {
			isDropdownOpen = false;
		}
	}

	$effect(() => {
		const style = getComputedStyle(document.documentElement);

		const primary = style.getPropertyValue("--primary").trim();
		const grid = style.getPropertyValue("--border-subtle").trim();
		const tick = style.getPropertyValue("--text-muted").trim();
		const tooltipBg = style.getPropertyValue("--bg-alpha").trim();
		const tooltipText = style.getPropertyValue("--text").trim();

		if (donutCanvas) {
			const centerTextPlugin = {
				id: "centerText",
				beforeDraw(chart: Chart) {
					const { ctx, chartArea } = chart;
					if (!chartArea) return;

					ctx.save();

					const text = formatCurrency(filteredTotalExpenses);

					ctx.fillStyle = style.getPropertyValue("--text").trim() || "#333";
					ctx.font = "bold 24px sans-serif";
					ctx.textBaseline = "middle";

					const centerX = (chartArea.left + chartArea.right) / 2;
					const centerY = (chartArea.top + chartArea.bottom) / 2;

					const textWidth = ctx.measureText(text).width;

					ctx.fillText(text, centerX - textWidth / 2, centerY);

					ctx.font = "14px sans-serif";
					ctx.fillStyle = style.getPropertyValue("--text-muted").trim() || "#888";
					const labelText = "Total";
					const labelWidth = ctx.measureText(labelText).width;
					ctx.fillText(labelText, centerX - labelWidth / 2, centerY + 25);

					ctx.restore();
				},
			};

			donutChartInstance = new Chart<"doughnut", number[], string>(donutCanvas, {
				type: "doughnut",
				data: {
					labels: categoryExpenseTotals.map(([name]) => name),
					datasets: [
						{
							data: categoryExpenseTotals.map(([, amount]) => amount),
							backgroundColor: generatePalette(primary, categoryExpenseTotals.length),
							borderColor: style.getPropertyValue("--bg").trim(),
							borderWidth: 2,
							hoverOffset: 8,
						},
					],
				},
				plugins: [centerTextPlugin],
				options: {
					responsive: true,
					cutout: "70%",
					plugins: {
						legend: {
							display: false,
						},
						tooltip: {
							enabled: true,
							backgroundColor: tooltipBg,
							titleColor: tooltipText,
							bodyColor: tooltipText,
							titleFont: {
								size: 14,
								weight: "bold",
							},
							bodyFont: {
								size: 14,
							},
							padding: 12,
							cornerRadius: 8,
							displayColors: false,
							callbacks: {
								title: (context) => context[0].label,

								label: (context) => {
									const amount = context.parsed;
									const percent =
										filteredTotalExpenses > 0 ? (amount / filteredTotalExpenses) * 100 : 0;

									return [formatCurrency(amount), `${percent.toFixed(1)}% of spending`];
								},
							},
						},
					},
				},
			});
		}

		if (barCanvas) {
			barChartInstance = new Chart(barCanvas, {
				type: "bar",
				data: {
					labels: categoryExpenseTotals.map(([name]) => name),
					datasets: [
						{
							label: "Amount",
							data: categoryExpenseTotals.map(([, amount]) => amount),
							backgroundColor: primary,
						},
					],
				},
				options: {
					indexAxis: "y",
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false,
						},
						tooltip: {
							backgroundColor: tooltipBg,
							titleColor: tooltipText,
							bodyColor: tooltipText,
							callbacks: {
								label: (ctx) => {
									const amount = ctx.parsed.x ?? 0;
									const percent =
										filteredTotalExpenses === 0 ? 0 : (amount / filteredTotalExpenses) * 100;

									return [formatCurrency(amount), `${percent.toFixed(1)}% of spending`];
								},
							},
						},
					},
					scales: {
						x: {
							grid: {
								color: grid,
							},
							ticks: {
								color: tick,
								callback: (value) => formatCurrency(Number(value)),
							},
						},
						y: {
							grid: {
								display: false,
							},
							ticks: {
								color: tick,
							},
						},
					},
				},
			});
		}
		return () => {
			barChartInstance?.destroy();
			donutChartInstance?.destroy();
		};
	});

	$effect(() => {
		if (donutChartInstance) {
			donutChartInstance.data.labels = categoryExpenseTotals.map(([name]) => name);
			donutChartInstance.data.datasets[0].data = categoryExpenseTotals.map(([, amount]) => amount);
			donutChartInstance.data.datasets[0].backgroundColor = generatePalette(
				getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
				categoryExpenseTotals.length,
			);

			donutChartInstance.update();
		}

		if (barChartInstance) {
			barChartInstance.data.labels = categoryExpenseTotals.map(([name]) => name);
			barChartInstance.data.datasets[0].data = categoryExpenseTotals.map(([, amount]) => amount);

			barChartInstance.update();
		}
	});
</script>

<svelte:window onclick={handleWindowClick} />

<div class="chart-wrapper">
	<div class="controls-row">
		<!-- Time range buttons -->
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
		</div>

		<!-- Checkbox Filters -->
		{#if allCategories.length > 0}
			<div class="dropdown-container" bind:this={dropdownContainer}>
				<button
					class="pill"
					class:active={isDropdownOpen}
					onclick={() => (isDropdownOpen = !isDropdownOpen)}
					type="button"
				>
					Filter Categories ({activeCategoryCount}/{allCategories.length})
				</button>

				{#if isDropdownOpen}
					<div class="dropdown-menu">
						<div class="dropdown-header">
							<h4>Visible Categories</h4>
							<button class="close-btn" onclick={() => (isDropdownOpen = false)}>✕</button>
						</div>
						<div class="checkbox-grid">
							{#each allCategories as category (category)}
								<label class="checkbox-label">
									<input
										type="checkbox"
										checked={!excludedCategories.includes(category)}
										onchange={() => toggleCategory(category)}
									/>
									{category}
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Graphs -->
	<div class="category-graphs">
		<div class="donut-chart">
			<canvas bind:this={donutCanvas}></canvas>
		</div>

		<div class="bar-chart">
			<canvas bind:this={barCanvas}></canvas>
		</div>
	</div>
</div>
