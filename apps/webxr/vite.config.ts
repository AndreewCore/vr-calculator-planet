import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// WebXR solo está disponible en contextos seguros: el Quest necesita HTTPS para abrir la app por la LAN.
export default defineConfig({
  plugins: [basicSsl()],
  server: { port: 5173 },
  // three.js por sí solo supera los 500 kB; dividirlo no aporta nada en una app de una sola escena.
  build: { chunkSizeWarningLimit: 800 },
});
