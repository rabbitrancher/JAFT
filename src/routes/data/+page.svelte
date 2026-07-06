<script lang="ts">
	import { DEFAULT_SELECTED_HEADERS } from "$lib/tableHeaders.js";
	import { toTitleCase } from "$lib/utils/format.js";
	import { onMount } from "svelte";
	import { Pencil, SquareCheckBig } from "@lucide/svelte/icons";
	import { invalidateAll } from "$app/navigation";
	import Fuse from "fuse.js";

	let { data } = $props();

	let possibleHeaders = $state(DEFAULT_SELECTED_HEADERS);
	let categoriesEnforced = $state<boolean>(true);
	let showDescSuggestions = $state(false);

	const descFuse = $derived(new Fuse(data.descriptions, { threshold: 0.4 }));

	/**
	 * The ID of the current row being edited, corresponding to the SQL id
	 */
	let curEditId = $state<number | null>(null);

	/**
	 * The values of the row currently being edited on the table
	 */
	let editValues = $state<EditValues | null>(null);

	let descSuggestions = $derived(
		editValues && editValues.description.length > 0
			? descFuse
					.search(editValues.description)
					.slice(0, 5)
					.map((r) => r.item)
			: [],
	);

	// on page load, if there is local storage, use that instead of the default values for table headers for the selected headers, as well as if categories are enforced.
	onMount(() => {
		const headersSaved = localStorage.getItem("table_headers");
		if (headersSaved) {
			const parsedHeaders = JSON.parse(headersSaved);
			if (parsedHeaders.length > 0) {
				possibleHeaders = parsedHeaders;
			}
		}

		const categoriesEnforcedSaved = localStorage.getItem("categories_enforced");
		if (categoriesEnforcedSaved != null) {
			const parsedEnforcement = JSON.parse(categoriesEnforcedSaved);
			categoriesEnforced = parsedEnforcement;
		}
	});

	/**
	 * Stores the values of a row on the table
	 */
	type EditValues = {
		date: string;
		amount: number;
		type: "income" | "expense";
		category: string;
		description: string;
		notes: string;
	};

	/**
	 * Switches a row into edit mode, pre-filling inputs with current values.
	 * Saves any previously edited row first.
	 */
	async function editLine(entry: (typeof data.entries)[number]) {
		await doneEdit();
		curEditId = entry.id;
		editValues = {
			date: entry.date,
			amount: entry.amount,
			type: entry.type as "income" | "expense",
			category: entry.category ?? "",
			description: entry.description ?? "",
			notes: entry.notes ?? "",
		};
	}

	/**
	 * Saves the currently edited row to the server, then exits edit mode.
	 * Passes the current categories enforcement setting so the server knows whether to allow new categories or reject them.
	 */
	async function doneEdit() {
		if (curEditId === null || editValues === null) return;
		await fetch("/data", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: curEditId,
				updates: editValues,
				allowNewCategories: !categoriesEnforced,
			}),
		});
		// reload the table so values are updated
		await invalidateAll();
		curEditId = null;
		editValues = null;
	}
</script>

<!--stores all unique categories in the sql db-->
<datalist id="categories">
	{#each data.categories as category (category)}
		<option value={category}></option>
	{/each}
</datalist>

<h1>Your Entries</h1>

{#if data.entries.length === 0}
	<p>No entries yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th></th>
				{#each possibleHeaders as header (header.header.key)}
					{#if header.selected}
						<th>{header.header.label}</th>
					{/if}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry (entry.id)}
				<tr>
					<td class="edit-col">
						{#if entry.id !== curEditId}
							<Pencil class="clickable-icon" size={16} onclick={() => editLine(entry)} />
						{:else}
							<SquareCheckBig class="clickable-icon" size={16} onclick={() => doneEdit()} />
						{/if}
					</td>
					{#each possibleHeaders as header (header.header.key)}
						{#if header.selected}
							<td class:edit={entry.id === curEditId && editValues}>
								{#if entry.id === curEditId && editValues}
									<!-- edit mode -->
									{#if header.header.key === "date"}
										<input type="date" bind:value={editValues.date} />
									{:else if header.header.key === "amount"}
										<input type="number" step="0.01" bind:value={editValues.amount} />
									{:else if header.header.key === "type"}
										<select bind:value={editValues.type}>
											<option value="expense">Expense</option>
											<option value="income">Income</option>
										</select>
									{:else if header.header.key === "category"}
										<input type="text" list="categories" bind:value={editValues.category} />
									{:else if header.header.key === "description"}
										<div class="autocomplete">
											<input
												type="text"
												bind:value={editValues.description}
												onfocus={() => (showDescSuggestions = true)}
												onblur={() => (showDescSuggestions = false)}
												autocomplete="off"
											/>
											{#if showDescSuggestions && descSuggestions.length > 0}
												<ul class="suggestions">
													{#each descSuggestions as suggestion (suggestion)}
														<li>
															<button
																type="button"
																onmousedown={() => (editValues!.description = suggestion)}
															>
																{suggestion}
															</button>
														</li>
													{/each}
												</ul>
											{/if}
										</div>
									{:else if header.header.key === "notes"}
										<input type="text" bind:value={editValues.notes} />
									{/if}
								{:else}
									<!-- display mode -->
									{#if header.header.key === "date"}
										{new Date(entry.date).toLocaleDateString()}
									{:else if header.header.key === "amount"}
										${entry.amount.toFixed(2)}
									{:else if header.header.key === "type"}
										{toTitleCase(entry.type)}
									{:else}
										{entry[header.header.key as keyof typeof entry]}
									{/if}
								{/if}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
