<script lang="ts">
	import { DEFAULT_HEADERS, type Header } from "$lib/tableHeaders";
	import { onMount } from "svelte";

	let { data } = $props();

	let selectedHeaders = $state<Header[]>([...DEFAULT_HEADERS]);

	// on page load, use the default table headers for the selected headers if there is no local storage
	onMount(() => {
		const saved = localStorage.getItem("tableHeaders");
		if (saved) {
			const parsed = JSON.parse(saved);
			if (parsed.length > 0) {
				selectedHeaders = parsed;
			}
		}
	});

	/**
	 * Toggles a header in the locally stored list of selected headers.
	 *
	 * If the header is already selected, it is removed from the list.
	 * If the header is not selected, it is added to the list.
	 * The updated list of selected headers is then saved to local storage.
	 *
	 * @param {Header} header The header to toggle
	 */
	function toggleHeader(header: Header) {
		if (selectedHeaders.some((h) => h.key === header.key)) {
			selectedHeaders = selectedHeaders.filter((h) => h.key !== header.key);
		} else {
			selectedHeaders = [...selectedHeaders, header];
		}
		localStorage.setItem("tableHeaders", JSON.stringify(selectedHeaders));
	}
</script>

<div class="hero">
	<div class="settings-section">
		<h2>Table Columns</h2>
		<p class="settings-description">
			Choose which columns to display in your data table.
		</p>
		<div class="pill-group">
			{#each data.allHeaders as possibleHeader (possibleHeader.key)}
				<button
					class="pill"
					class:active={selectedHeaders.some(
						(h) => h.key === possibleHeader.key,
					)}
					onclick={() => toggleHeader(possibleHeader)}
					type="button"
				>
					{possibleHeader.label}
				</button>
			{/each}
		</div>
	</div>
</div>
