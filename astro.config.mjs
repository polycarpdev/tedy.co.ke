// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://tedy.co.ke',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({ filter: (page) => !page.includes('404') && !page.includes('/admin') }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': { target: 'https://tedy.co.ke', changeOrigin: true, secure: true },
        '/media': { target: 'https://tedy.co.ke', changeOrigin: true, secure: true },
      },
    },
  },
});
