import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  server: {
    proxy: {
      '/db': {
        target: 'https://checklist-server-nej7.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://checklist-server-nej7.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
