<script lang="ts">
	import { resolve } from "$app/paths";
	import logo from "$lib/assets/logo.png";
	import "$lib/styles/app.css";

	let { children } = $props();
	import { Settings } from "@lucide/svelte/icons";
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>JABA</title>
</svelte:head>
<nav>
	<div class="nav-bar">
		<a href={resolve("/")} title="Home">
			<img class="logo" src={logo} alt="Logo" />
		</a>
		<a class="nav-a" href={resolve("/entry")}>Entry</a>
		<a class="nav-a" href={resolve("/table")}>Data Table</a>
		<a class="nav-a" href={resolve("/graphs")}>Data Graphs</a>
	</div>
	<a class="nav-a" href={resolve("/settings")} title="Settings">
		<Settings />
	</a>
</nav>
{@render children()}
