import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node", // Or 'jsdom' if testing browser environments
		globals: true, // This makes test utilities like describe, it, expect, etc. globally available
	},
	resolve: {
		alias: {
		    "@/": path.resolve(__dirname, "./src"),
		},
	},
});
