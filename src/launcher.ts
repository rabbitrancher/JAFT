import { spawn } from "bun";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const appDir = dirname(process.execPath);
const dbPath = join(appDir, "finances.db");

const server = spawn(["bun", "build/index.js"], {
	env: { ...process.env, PORT: "3000", DATABASE_URL: dbPath },
	stdio: ["inherit", "inherit", "inherit"],
});

process.on("exit", () => server.kill());

const url = "http://localhost:3000";

async function waitForServer(maxAttempts = 50) {
	for (let i = 0; i < maxAttempts; i++) {
		try {
			await fetch(url);
			return true;
		} catch {
			await new Promise((r) => setTimeout(r, 50));
		}
	}
	return false;
}

function isWSL(): boolean {
	try {
		return readFileSync("/proc/version", "utf-8").toLowerCase().includes("microsoft");
	} catch {
		return false;
	}
}

function getOpenCommand(): string[] {
	if (process.platform === "win32") return ["cmd", "/c", "start", ""];
	if (process.platform === "darwin") return ["open"];
	if (isWSL()) return ["cmd.exe", "/c", "start", ""];
	return ["xdg-open"];
}

if (await waitForServer()) {
	try {
		await spawn([...getOpenCommand(), url]);
	} catch {
		console.log(`Couldn't open a browser automatically. Open this URL manually: ${url}`);
	}
} else {
	console.error("Server didn't start in time");
}
