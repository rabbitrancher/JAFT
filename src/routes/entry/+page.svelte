<script lang="ts">
	import { enhance } from "$app/forms";
	import Fuse from "fuse.js";
	import { onMount } from "svelte";

	let { form, data } = $props();

	let categoriesEnforced = $state(true);

	// on page load, if there's no local storage for if categories have be enforced, assume they are
	onMount(() => {
		const saved = localStorage.getItem("categories_enforced");
		if (saved) {
			let parsed = JSON.parse(saved);
			categoriesEnforced = parsed;
		}
	});

	// category autocomplete
	let category_input = $state("");
	let showCategorySuggestions = $state(false);

	const categoryFuse = $derived(new Fuse(data.categories, { threshold: 0.4 }));

	let category_suggestions = $derived(
		category_input.length > 0
			? categoryFuse
					.search(category_input)
					// only closest 5
					.slice(0, 5)
					.map((r) => r.item)
			: [],
	);

	function selectCategory(value: string) {
		category_input = value;
		showCategorySuggestions = false;
	}

	// description autocomplete
	let description_input = $state("");
	let showDescriptionSuggestions = $state(false);

	const descFuse = $derived(new Fuse(data.descriptions, { threshold: 0.4 }));

	let description_suggestions = $derived(
		description_input.length > 0
			? descFuse
					.search(description_input)
					// only closest 5
					.slice(0, 5)
					.map((r) => r.item)
			: [],
	);

	function selectDescription(value: string) {
		description_input = value;
		showDescriptionSuggestions = false;
	}

	// default date to today
	const today = new Date().toISOString().split("T")[0];
</script>

<form method="POST" class="hero entry-form" use:enhance>
	<div class="field">
		<label for="amount">Amount:</label>
		<input type="number" id="amount" name="amount" placeholder="($)" step="0.01" required />
	</div>

	<div class="field">
		<label for="type">Type:</label>
		<select id="type" name="type" required>
			<option value="expense">Expense</option>
			<option value="income">Income</option>
		</select>
	</div>

	<!-- use a hidden field to transfer browser data (localStorage) to the server -->
	<input type="hidden" name="categories_enforced" value={categoriesEnforced} />

	<div class="field">
		<label for="category">Category:</label>
		<div class="autocomplete">
			<input
				type="text"
				id="category"
				name="category"
				bind:value={category_input}
				onfocus={() => (showCategorySuggestions = true)}
				onblur={() => (showCategorySuggestions = false)}
				autocomplete="off"
				required
			/>
			{#if showCategorySuggestions && category_suggestions.length > 0}
				<ul class="suggestions">
					{#each category_suggestions as suggestion (suggestion)}
						<li>
							<button
								type="button"
								// use onmousedown because onBlur() would actually stop happening before on click takes effect, meaning nothing would be selected
								onmousedown={() => selectCategory(suggestion)}
							>
								{suggestion}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<div class="field">
		<label for="description">Description:</label>
		<div class="autocomplete">
			<input
				type="text"
				id="description"
				name="description"
				bind:value={description_input}
				onfocus={() => (showDescriptionSuggestions = true)}
				onblur={() => (showDescriptionSuggestions = false)}
				autocomplete="off"
			/>
			{#if showDescriptionSuggestions && description_suggestions.length > 0}
				<ul class="suggestions">
					{#each description_suggestions as suggestion (suggestion)}
						<li>
							<button
								type="button"
								// use onmousedown because onBlur() would actually stop happening before on click takes effect, meaning nothing would be selected
								onmousedown={() => selectDescription(suggestion)}
							>
								{suggestion}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<div class="field">
		<label for="notes">Notes:</label>
		<textarea id="notes" name="notes" placeholder="Any extra details..."></textarea>
	</div>

	<div class="field">
		<label for="date">Date:</label>
		<input type="date" id="date" name="date" value={today} required />
	</div>

	<div></div>
	<button type="submit" class="button">Save Entry</button>

	{#if form?.success}
		<p class="success">Entry saved!</p>
	{:else if form?.error}
		<p class="error">{form.error}</p>
	{/if}
</form>
