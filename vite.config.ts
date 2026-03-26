import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: {},
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
        secure: false,
      },
    },
  },
})
