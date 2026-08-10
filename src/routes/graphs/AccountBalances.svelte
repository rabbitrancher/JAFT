<script lang="ts">
	import { formatCurrency } from "$lib/utils/format";
	import type { AccountBalance } from "./graphContainers";

	let { accounts } = $props<{ accounts: AccountBalance[] }>();
</script>

<div class="small-card-descriptions">
	{#each accounts as account (account.id)}
		<div class="small-card-row">
			<div class="small-card-row-header">
				<span class="small-card-description">{account.name}</span>
				<span
					class="small-card-count"
					class:positive={account.balance >= 0}
					class:negative={account.balance < 0}
				>
					{formatCurrency(account.balance)}
				</span>
			</div>
			<span class="small-card-total">{account.type}</span>
		</div>
	{/each}
</div>
