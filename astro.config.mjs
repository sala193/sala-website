import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 官網主網域為 www（不帶 www 會 308 轉址到這裡）
  site: 'https://www.salahome.tw',
  integrations: [sitemap()],
});
