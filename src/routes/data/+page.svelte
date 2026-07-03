<script lang="ts">
	import { DEFAULT_SELECTED_HEADERS } from "$lib/tableHeaders.js";
	import { toTitleCase } from "$lib/utils/format.js";
	import { onMount } from "svelte";

	let { data } = $props();

	// default visibleHeaders
	let headers = $state(DEFAULT_SELECTED_HEADERS);

	// on page load, if there's no local storage for the table headers use the default values
	onMount(() => {
		const saved = localStorage.getItem("tableHeaders");
		if (saved) {
			let parsed = JSON.parse(saved);
			if (parsed.length > 0) {
				headers = parsed;
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
				{#each headers as possibleHeader (possibleHeader.header.key)}
					{#if possibleHeader.selected}
						<th>{possibleHeader.header.label}</th>
					{/if}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry (entry.id)}
				<tr>
					{#each headers as possibleHeader (possibleHeader.header.key)}
						{#if possibleHeader.selected}
							<td>
								{#if possibleHeader.header.key === "date"}
									{new Date(entry.date).toLocaleDateString()}
								{:else if possibleHeader.header.key === "amount"}
									${entry.amount.toFixed(2)}
								{:else if possibleHeader.header.key === "type"}
									{toTitleCase(entry.type)}
								{:else}
									{entry[possibleHeader.header.key as keyof typeof entry]}
								{/if}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
