<script lang="ts">
	import { DEFAULT_HEADERS } from "$lib/tableHeaders.js";
	import { onMount } from "svelte";

	let { data } = $props();

	// default visibleHeaders
	let visibleHeaders = $state(DEFAULT_HEADERS);

	// on page load, if there's no local storage for the table headers use the default values
	onMount(() => {
		const saved = localStorage.getItem("tableHeaders");
		if (saved) {
			let parsed = JSON.parse(saved);
			if (parsed.length > 0) {
				visibleHeaders = parsed;
			}
		}
	});
</script>

<h1>Your Entries</h1>

{#if data.entries.length === 0}
	<p>No entries yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				{#each visibleHeaders as header (header.key)}
					<th>{header.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry (entry.id)}
				<tr>
					{#each visibleHeaders as header (header)}
						<td>
							{#if header.key === "date"}
								{new Date(entry.date).toLocaleDateString()}
							{:else if header.key === "amount"}
								${entry.amount.toFixed(2)}
							{:else}
								{entry[header.key as keyof typeof entry]}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
