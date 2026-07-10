<script lang="ts">
	import { DEFAULT_SELECTED_HEADERS, type HeaderOption } from "$lib/tableHeaders";
	import { onMount } from "svelte";
	import { LockOpen } from "@lucide/svelte/icons";
	import { Lock } from "@lucide/svelte/icons";

	let headers = $state<HeaderOption[]>(DEFAULT_SELECTED_HEADERS);

	let categoriesEnforced = $state<boolean>(true);

	// on page load, if there is local storage, use that instead of the default values for table headers for the selected headers, as well as if categories are enforced.
	onMount(() => {
		const headersSaved = localStorage.getItem("table_headers");
		if (headersSaved) {
			const parsedHeaders = JSON.parse(headersSaved);
			if (parsedHeaders.length > 0) {
				headers = parsedHeaders;
			}
		}

		const categoriesEnforcedSaved = localStorage.getItem("categories_enforced");
		if (categoriesEnforcedSaved != null) {
			const parsedEnforcement = JSON.parse(categoriesEnforcedSaved);
			categoriesEnforced = parsedEnforcement;
		}
	});

	/**
	 * Toggles a header as being selected or not in the locally stored list headers.
	 *
	 * @param {Header} header The header to toggle
	 */
	function toggleHeader(header: HeaderOption) {
		header.selected = !header.selected;
		localStorage.setItem("table_headers", JSON.stringify(headers));
	}
	/**
	 * The index of the currently dragged element, or null if no element is being dragged.
	 */
	let dragIndex = $state<number | null>(null);

	/**
	 * Handles the drag start event by updating the dragIndex state.
	 *
	 * @param {number} i The index of the element being dragged.
	 */
	function dragstart(i: number) {
		dragIndex = i;
	}

	/**
	 * Reorders the Headers array and saves the change to local storage.
	 *
	 * @param {number} i The index where the dragged element should be dropped.
	 */
	function drop(i: number) {
		if (dragIndex === null || dragIndex === i) return;

		const updated = [...headers];
		const [moved] = updated.splice(dragIndex, 1);
		updated.splice(i, 0, moved);

		headers = updated;
		localStorage.setItem("table_headers", JSON.stringify(headers));
		dragIndex = null;
	}

	function toggleLockedCategories() {
		categoriesEnforced = !categoriesEnforced;
		localStorage.setItem("categories_enforced", JSON.stringify(categoriesEnforced));
	}
</script>

<!--Column Customization-->
<div class="hero">
	<div class="settings-section">
		<h2>Table Columns</h2>
		<p class="settings-description">
			Choose which columns to display in your data table.
			<br />
			You can also reorganize the order of the columns via drag-and-dropping the column names.
		</p>
		<div class="pill-group">
			{#each headers as possibleHeader, i (possibleHeader.header.key)}
				<button
					class="pill"
					class:active={possibleHeader.selected}
					draggable="true"
					ondragstart={() => dragstart(i)}
					ondragover={(e) => e.preventDefault()}
					ondragenter={(e) => e.preventDefault()}
					ondrop={() => drop(i)}
					onclick={() => toggleHeader(possibleHeader)}
					type="button"
				>
					{possibleHeader.header.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<!--Enforced Categories-->
<div class="hero">
	<div class="settings-section">
		<h2>Enforce Categories</h2>
		<p class="settings-description">
			Choose whether or not entered Categories must come from the predefined set of possibilities,
			or can be freeform.
		</p>
		<div class="pill-group center-inside">
			<button
				class="pill pill-icon"
				class:active={categoriesEnforced}
				onclick={() => toggleLockedCategories()}
				>{#if categoriesEnforced}
					<Lock /> Locked
				{:else}
					<LockOpen /> Unlocked
				{/if}</button
			>
		</div>
	</div>
</div>
