<script>
	import { resolve } from "$app/paths";
	import "$lib/styles/app.css";
</script>

<div class="hero">
	<h1>Welcome to JABA!</h1>
	<div class="button-row">
		<a href={resolve("/entry")} class="button">Enter Entry</a>
		<a href={resolve("/table")} class="button">View Data Table</a>
	</div>
</div>
