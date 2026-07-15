<script lang="ts">
	import type { PopularDescription } from "./+page.server";
	import { formatCurrency } from "$lib/utils/format";

	let { descriptions } = $props<{ descriptions: PopularDescription[] }>();

	let maxCount = $derived(Math.max(...descriptions.map((d: PopularDescription) => d.count), 1));
</script>

<div class="popular-descriptions">
	{#each descriptions as item (item.description)}
		<div class="popular-row">
			<div class="popular-row-header">
				<span class="popular-description">{item.description}</span>
				<span class="popular-count">{item.count}</span>
			</div>
			<div class="popular-bar-track">
				<div class="popular-bar-fill" style:width="{(item.count / maxCount) * 100}%"></div>
			</div>
			<span class="popular-total">{formatCurrency(item.total)} total</span>
		</div>
	{/each}
</div>
