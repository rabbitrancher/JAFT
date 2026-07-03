<script lang="ts">
	import {
		DEFAULT_SELECTED_HEADERS,
		type HeaderOption,
	} from "$lib/tableHeaders";
	import { onMount } from "svelte";

	let headers = $state<HeaderOption[]>(DEFAULT_SELECTED_HEADERS);

	// on page load, if there is local storage, use that instead of the default table headers for the selected headers
	onMount(() => {
		const saved = localStorage.getItem("tableHeaders");
		if (saved) {
			const parsed = JSON.parse(saved);
			if (parsed.length > 0) {
				headers = parsed;
			}
		}
	});

	/**
	 * Toggles a header as being selected or not in the locally stored list headers.
	 *
	 * @param {Header} header The header to toggle
	 */
	function toggleHeader(header: HeaderOption) {
		header.selected = !header.selected;
		localStorage.setItem("tableHeaders", JSON.stringify(headers));
	}
	/**
	 * The index of the currently dragged element, or null if no element is being dragged.
	 */
	let dragIndex = $state<number | null>(null);

	/**
	 * Handles the drag start event by updating the dragIndex state.
	 *
	 * @param {number} index The index of the element being dragged.
	 */
	function dragstart(index: number) {
		dragIndex = index;
	}

	/**
	 * Reorders the Headers array and saves the change to local storage.
	 *
	 * @param {number} index The index where the dragged element should be dropped.
	 */
	function drop(index: number) {
		if (dragIndex === null || dragIndex === index) return;

		const updated = [...headers];
		const [moved] = updated.splice(dragIndex, 1);
		updated.splice(index, 0, moved);

		headers = updated;
		localStorage.setItem("tableHeaders", JSON.stringify(headers));
		dragIndex = null;
	}
</script>

<div class="hero">
	<div class="settings-section">
		<h2>Table Columns</h2>
		<p class="settings-description">
			Choose which columns to display in your data table.
			<br />
			You can also reorganize the order of the columns via drag-and-dropping the column
			names.
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
