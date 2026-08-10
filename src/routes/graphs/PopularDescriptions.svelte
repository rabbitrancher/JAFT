<script lang="ts">
	import { formatCurrency } from "$lib/utils/format";
	import type { PopularDescription } from "./graphContainers";

	let { descriptions } = $props<{ descriptions: PopularDescription[] }>();

	let maxCount = $derived(Math.max(...descriptions.map((d: PopularDescription) => d.count), 1));
</script>

<div class="small-card-descriptions">
	{#each descriptions as item (item.description)}
		<div class="small-card-row">
			<div class="small-card-row-header">
				<span class="small-card-description">{item.description}</span>
				<span class="small-card-count">{item.count}</span>
			</div>
			<div class="small-card-bar-track">
				<div class="small-card-bar-fill" style:width="{(item.count / maxCount) * 100}%"></div>
			</div>
			<span class="small-card-total">{formatCurrency(item.total)} total</span>
		</div>
	{/each}
</div>
