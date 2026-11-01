import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { allowedHosts:["terminal.local"], fs: { allow: ['..'] } }, build: { outDir: 'dist' } })
