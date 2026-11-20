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
    sitemap({ filter: (page) => !page.includes('404') }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: { plugins: [tailwindcss()] },
});
