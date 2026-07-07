<script lang="ts">
	import { DEFAULT_SELECTED_HEADERS } from "$lib/tableHeaders.js";
	import { toTitleCase } from "$lib/utils/format.js";
	import { onMount } from "svelte";
	import { Pencil, SquareCheckBig, Trash2, CircleCheckBig } from "@lucide/svelte/icons";
	import { invalidateAll } from "$app/navigation";
	import Fuse from "fuse.js";

	let { data } = $props();

	/**
	 * Stores the configuration of the table headers, including which headers are currently selected for display.
	 * This is initialized with the default selected headers.
	 */
	let possibleHeaders = $state(DEFAULT_SELECTED_HEADERS);

	/**
	 * Stores whether the enforcement of categories is currently enabled or disabled.
	 * When enabled, users can only select from existing categories when editing a row.
	 * When disabled, users can enter a new category when editing a row.
	 */
	let categoriesEnforced = $state<boolean>(true);

	/**
	 * Stores whether the description suggestions should currently be shown or not.
	 * Description suggestions are a list of previously entered descriptions that match the current input.
	 */
	let showDescSuggestions = $state(false);

	/**
	 * Creates a Fuse.js instance for searching through the list of previously entered descriptions.
	 * This Fuse instance is used to generate the description suggestions.
	 */
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
		const success = await doneEdit();
		// if the previous edit was not a success, do not switch to a new line for editing
		if (!success) {
			return;
		}
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
	 * Contains the error message for if a entry was not saved upon edit
	 */
	let saveError = $state<string | null>(null);

	/**
	 * Saves the currently edited row to the server, then exits edit mode.
	 * Passes the current categories enforcement setting so the server knows whether to allow new categories or reject them.
	 * @returns true if the edit was successful, or false if there was an error
	 */
	async function doneEdit(): Promise<boolean> {
		// if this was called when nothing was selected, it's considered a pass
		if (curEditId === null || editValues === null) {
			return true;
		}
		const result = await fetch("/data", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: curEditId,
				updates: editValues,
				allowNewCategories: !categoriesEnforced,
			}),
		});
		const json = await result.json();
		if (!result.ok) {
			saveError = json.error;
			return false;
		}
		await invalidateAll();
		resetLines();
		return true;
	}

	/**
	 * The ID of the row that could be deleted if confirmDelete() is called, corresponding to the SQL id.
	 */
	let pendingDeleteId = $state<number | null>(null);
	/**
	 * Contains the error message for if a entry was not saved upon edit
	 */
	let deleteError = $state<string | null>(null);

	/**
	 * Enables deletion of the currently edited row.
	 * Sets a timeout to disable deletion after 3 seconds unless attempted again.
	 */
	function enableDelete() {
		pendingDeleteId = curEditId;
		// after 3 seconds, disable delete unless attempted again
		setTimeout(() => {
			pendingDeleteId = null;
		}, 3000);
	}

	/**
	 * Confirms deletion of the currently edited row.
	 * Sends a DELETE request to the server with the ID of the row to be deleted.
	 * If the deletion is successful, invalidates all data and resets edit/delete state.
	 * @returns true if the deletion was successful, or false if there was an error
	 */
	async function confirmDelete(): Promise<boolean> {
		if (curEditId === null || editValues === null) {
			return true;
		}
		const result = await fetch("/data", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: pendingDeleteId,
			}),
		});
		const json = await result.json();
		if (!result.ok) {
			deleteError = json.error;
			return false;
		}
		await invalidateAll();
		resetLines();
		return true;
	}

	/**
	 * Resets all edit/delete-related state variables to their default null values.
	 * This function is called after a successful edit or delete operation.
	 */
	function resetLines() {
		curEditId = null;
		editValues = null;
		saveError = null;
		pendingDeleteId = null;
		deleteError = null;
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
					<td class:icon-col={!saveError}>
						{#if entry.id !== curEditId}
							<Pencil class="clickable-icon" size={16} onclick={() => editLine(entry)} />
						{:else}
							<SquareCheckBig class="clickable-icon" size={16} onclick={() => doneEdit()} />
							{#if saveError}
								<span class="error">{saveError}</span>
							{/if}
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

					{#if entry.id === curEditId && editValues}
						<td class="edit-col top-bot-border">
							{#if deleteError}
								<span class="error">{deleteError}</span>
							{/if}
							{#if pendingDeleteId}
								<CircleCheckBig
									class="clickable-icon error"
									size={16}
									onclick={() => confirmDelete()}
								/>
							{:else}
								<Trash2 class="clickable-icon" size={16} onclick={() => enableDelete()} />
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
