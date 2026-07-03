<script lang="ts">
	let { data } = $props();
</script>

<h1>Your Entries</h1>

{#if data.entries.length === 0}
	<p>No entries yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Amount</th>
				<th>Description</th>
				<th>Category</th>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry (entry.id)}
				<tr>
					<td>{new Date(entry.date).toLocaleDateString()}</td>
					<td>${entry.amount.toFixed(2)}</td>
					<td>{entry.description}</td>
					<td>{entry.category}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
