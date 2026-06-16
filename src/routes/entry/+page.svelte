<script lang="ts">
	import Fuse from 'fuse.js';

	let { form, data } = $props();

	// Category autocomplete
	let category_input = $state('');
	let showCategorySuggestions = $state(false);

	const categoryFuse = $derived(new Fuse(data.categories, { threshold: 0.4 }));

	let category_suggestions = $derived(
		category_input.length > 0
			? categoryFuse
					.search(category_input)
					.slice(0, 5)
					.map((r) => r.item)
			: []
	);

	function selectCategory(value: string) {
		category_input = value;
		showCategorySuggestions = false;
	}

	// Description autocomplete
	let description_input = $state('');
	let showDescriptionSuggestions = $state(false);

	const descFuse = $derived(new Fuse(data.descriptions, { threshold: 0.4 }));

	let description_suggestions = $derived(
		description_input.length > 0
			? descFuse
					.search(description_input)
					.slice(0, 5)
					.map((r) => r.item)
			: []
	);

	function selectDescription(value: string) {
		description_input = value;
		showDescriptionSuggestions = false;
	}

	// Default date to today
	const today = new Date().toISOString().split('T')[0];
</script>

<form method="POST" class="hero">
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

	<div class="field autocomplete">
		<label for="category">Category:</label>
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
						<button type="button" onmousedown={() => selectCategory(suggestion)}>
							{suggestion}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="field autocomplete">
		<label for="description">Description:</label>
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
						<button type="button" onmousedown={() => selectDescription(suggestion)}>
							{suggestion}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="field">
		<label for="notes">Notes:</label>
		<textarea id="notes" name="notes" placeholder="Any extra details..."></textarea>
	</div>

	<div class="field">
		<label for="date">Date:</label>
		<input type="date" id="date" name="date" value={today} required />
	</div>

	<button type="submit" class="button">Save Entry</button>

	{#if form?.success}
		<p class="success">Entry saved!</p>
	{:else if form?.error}
		<p class="error">{form.error}</p>
	{/if}
</form>

<style>
	.field {
		display: grid;
		grid-template-columns: 90px 1fr;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.autocomplete {
		position: relative;
	}

	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		list-style: none;
		margin: 0;
		padding: 0;
		z-index: 10;
	}

	.suggestions li button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		color: #374151;
	}

	.suggestions li button:hover {
		background-color: #f3f4f6;
	}

	select,
	input,
	textarea {
		padding: 0.4rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		width: 100%;
		box-sizing: border-box;
	}

	textarea {
		resize: vertical;
	}

	.success {
		color: #16a34a;
	}

	.error {
		color: #dc2626;
	}
</style>
