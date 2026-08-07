import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
	plugins: [react()],
	base: command === "build" ? "/timesheet-app/" : "/",
	css: {
		preprocessorOptions: {
			less: {
				math: "always",
			},
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:4000",
				changeOrigin: true,
			},
		},
	},
}));
