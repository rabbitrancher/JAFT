<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';

	let { children } = $props();
	import Settings from '@lucide/svelte/icons/settings';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>JABA</title>
</svelte:head>
<nav>
	<div style="display: flex; gap: 30px;">
		<a class="nav-a" href={resolve('/')}>Home</a>
		<a class="nav-a" href={resolve('/entry')}>Entry</a>
		<a class="nav-a" href={resolve('/data')}>View my Data</a>
	</div>
	<a class="nav-a" href={resolve('/settings')} title="Settings">
		<Settings />
	</a>
</nav>
{@render children()}
