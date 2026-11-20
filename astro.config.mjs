// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://tedy.co.ke',
  output: 'static',
  integrations: [react()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
