<script lang="ts">
	import { DEFAULT_SELECTED_HEADERS, type ValidColumnKey } from "$lib/tableHeaders.js";
	import { toTitleCase } from "$lib/utils/format.js";
	import { onMount, tick } from "svelte";
	import {
		ChevronDown,
		ChevronUp,
		CircleCheckBig,
		Pencil,
		Search,
		SquareCheckBig,
		Trash2,
	} from "@lucide/svelte/icons";
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import Fuse from "fuse.js";

	/**
	 * Represents the type of a field in the EditValues object, based on the column key.
	 *
	 * @template K The column key.
	 */
	type FieldType<K> = K extends "amount"
		? number
		: K extends "type"
			? "income" | "expense"
			: string;

	/**
	 * Represents the object containing the values of the row currently being edited.
	 * The properties of this object are determined by the ValidColumnKey type, and their types are determined by the FieldType type.
	 */
	type EditValues = {
		[K in ValidColumnKey]: FieldType<K>;
	};

	type SortDirection = "ASC" | "DESC";

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

	// svelte-ignore non_reactive_update
	/**
	 * Stores a reference to the HTML input element used for searching.
	 */
	let searchInput: HTMLInputElement;

	let searchQuery = $state("");

	let curDir = $state<SortDirection>("DESC");
	let curSortKey = $state<keyof EditValues>("date");

	/**
	 * The ID of the current row being edited, corresponding to the SQL id
	 */
	let curEditId = $state<number | null>(null);

	/**
	 * The values of the row currently being edited on the table
	 */
	let editValues = $state<EditValues | null>(null);

	/**
	 * Stores whether the description suggestions should currently be shown or not.
	 * Description suggestions are a list of previously entered descriptions that match the current input.
	 */
	let showDescSuggestions = $state(false);

	/**
	 * Contains the error message for if a entry was not saved upon edit.
	 */
	let saveError = $state<string | null>(null);

	/**
	 * The ID of the row that could be deleted if confirmDelete() is called, corresponding to the SQL id.
	 */
	let pendingDeleteId = $state<number | null>(null);

	/**
	 * Contains the error message for if an entry was not deleted upon delete.
	 */
	let deleteError = $state<string | null>(null);

	/**
	 * The date to highlight, set via the ?highlight= URL param from graph navigation.
	 * All rows matching this date will be highlighted and scrolled into view on load.
	 */
	let highlightDate = $state<string | null>(null);

	/**
	 * A derived store that returns the sorted entries based on the current sort key and direction.
	 * This store is updated automatically whenever the sort key or direction changes.
	 */
	let sortedEntries = $derived.by(() => {
		// Create a copy so we don't mutate the raw server props
		const entriesCopy = [...data.entries];

		return entriesCopy.sort((a, b) => {
			const valA = a[curSortKey as keyof typeof a];
			const valB = b[curSortKey as keyof typeof b];

			if (valA === null || valA === undefined) return 1;
			if (valB === null || valB === undefined) return -1;

			if (valA < valB) {
				return curDir === "ASC" ? -1 : 1;
			}
			if (valA > valB) {
				return curDir === "ASC" ? 1 : -1;
			}
			return 0;
		});
	});

	/**
	 * Creates a Fuse.js instance for searching through the sorted entries based on the currently selected headers.
	 * This Fuse instance is used to generate the search results that filters the table.
	 */
	const searchFuse = $derived(
		new Fuse(sortedEntries, {
			threshold: 0.4,
			keys: possibleHeaders
				.filter((h) => h.selected && ["notes", "category", "description"].includes(h.header.key))
				.map((h) => h.header.key),
		}),
	);

	/**
	 * A derived store that filters the sorted entries based on the current search query.
	 * If the search query is empty, returns the sorted entries.
	 * Otherwise, searches for the query in the currently selected headers and returns the matching entries.
	 */
	let filteredEntries = $derived.by(() => {
		if (!searchQuery.trim()) return sortedEntries;
		const results = searchFuse.search(searchQuery).map((r) => r.item);
		return sortedEntries.filter((e) => results.some((r) => r.id === e.id));
	});

	/**
	 * Creates a Fuse.js instance for searching through the list of previously entered descriptions.
	 * This Fuse instance is used to generate the description suggestions.
	 */
	const descFuse = $derived(new Fuse(data.descriptions, { threshold: 0.4 }));

	/**
	 * A derived store that generates a list of description suggestions based on the currently edited description.
	 * If the edited description is empty, an empty array is returned.
	 * Otherwise, the description is used as a search query in the descFuse instance, and up to 5 matching descriptions are returned.
	 */
	let descSuggestions = $derived(
		editValues && editValues.description.length > 0
			? descFuse
					.search(editValues.description)
					.slice(0, 5)
					.map((r) => r.item)
			: [],
	);

	// On page load, if there is local storage, use that instead of the default values for table headers for the selected headers, as well as if categories are enforced.
	// Also check for a highlight param from graph navigation and scroll to the matching row if found.
	onMount(async () => {
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

		const dateParam = page.url.searchParams.get("date");
		if (dateParam) {
			highlightDate = dateParam;
			await tick();
			document
				.querySelector(`tr[data-date="${dateParam}"]`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	});

	/**
	 * Sorts the entries based on the specified key.
	 * If the same key is clicked again, the sort direction is toggled.
	 * @param key The key to sort by.
	 */
	function sort_by(key: keyof EditValues) {
		// don't re-sort while a row is being edited
		if (curEditId !== null) {
			return;
		}

		if (curSortKey === key) {
			curDir = curDir === "ASC" ? "DESC" : "ASC";
		} else {
			curSortKey = key;
			curDir = "DESC";
		}
	}

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
		} as EditValues;
	}

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
		const result = await fetch("/table", {
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
		const result = await fetch("/table", {
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

<!--stores all unique categories from the sql db-->
<datalist id="categories">
	{#each data.categories as category (category)}
		<option value={category}></option>
	{/each}
</datalist>

<div class="table-header-row">
	<h1>Your Entries</h1>
	{#if possibleHeaders.filter((h) => h.selected && ["notes", "category", "description"].includes(h.header.key)).length > 0 && data.entries.length !== 0}
		<div class="search-row" style="align-self: flex-end;">
			<div class="search-box">
				<Search
					size={14}
					aria-hidden="true"
					class="clickable"
					onclick={() => searchInput.focus()}
				/>
				<input
					type="text"
					class="search-input"
					placeholder="Search entries..."
					bind:value={searchQuery}
					bind:this={searchInput}
					onfocus={() => searchInput.select()}
				/>
			</div>
		</div>
	{/if}
</div>

{#if data.entries.length === 0}
	<p>No entries yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th class="icon-col"></th>
				{#each possibleHeaders as header (header.header.key)}
					{#if header.selected}
						<th
							class="clickable"
							class:selected={header.header.key === curSortKey}
							onclick={() => sort_by(header.header.key)}
							title={header.header.key === curSortKey
								? curDir === "ASC"
									? "Sorted: Low to High"
									: "Sorted: High to Low"
								: "Click to sort by " + header.header.label}
							>{header.header.label}
							<span
								>{#if header.header.key === curSortKey}
									{#if header.header.key === curSortKey}
										{#if curDir === "ASC"}
											<ChevronUp size={14} />
										{:else}
											<ChevronDown size={14} />
										{/if}
									{:else}
										<ChevronUp size={14} class="hidden" />
									{/if}
								{/if}
							</span></th
						>
					{/if}
				{/each}
				<th class="icon-col hidden"></th>
			</tr>
		</thead>
		<tbody>
			{#each filteredEntries as entry (entry.id)}
				<tr data-date={entry.date} class:highlighted={entry.date === highlightDate}>
					<td class:icon-col={!saveError}>
						{#if entry.id !== curEditId}
							<span title="Edit Entry">
								<Pencil class="clickable" size={16} onclick={() => editLine(entry)} />
							</span>
						{:else}
							<span title="Save Entry">
								<SquareCheckBig class="clickable" size={16} onclick={() => doneEdit()} />
							</span>
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
										{new Date(entry.date + "T00:00:00").toLocaleDateString()}
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
						<td class="icon-col top-bot-border">
							{#if deleteError}
								<span class="error">{deleteError}</span>
							{/if}
							{#if pendingDeleteId}
								<span title="Confirm Delete">
									<CircleCheckBig
										class="clickable error"
										size={16}
										onclick={() => confirmDelete()}
									/>
								</span>
							{:else}
								<span title="Delete Entry">
									<Trash2 class="clickable" size={16} onclick={() => enableDelete()} />
								</span>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
