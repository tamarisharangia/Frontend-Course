import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite — сборщик: в режиме dev он мгновенно показывает изменения,
// а команда build собирает оптимизированные файлы для деплоя.
export default defineConfig({
  plugins: [react()],
});
