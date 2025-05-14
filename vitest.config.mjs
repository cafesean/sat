import tsconfigPaths from 'vite-tsconfig-paths'; // Import tsconfigPaths
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()], // Use tsconfigPaths plugin
	test: {
		environment: "node", // Or 'jsdom' if testing browser environments
		globals: true, // This makes test utilities like describe, it, expect, etc. globally available
		setupFiles: ['./src/tests/setup.ts'], // Add setup file
	},
	resolve: {
		alias: {
		    // "@/": path.resolve(__dirname, "./src"), // This alias is now handled by tsconfigPaths
		},
	},
});
